import * as XLSX from 'xlsx';
import type { AppConfig } from './configManager';

export interface ParsedExcelData {
  revenue: number;
  categories: Record<string, number>;
  sales: Record<string, number>;
  combinedSales: Record<string, number[]>;
  scrap: Record<string, number>;
}


function getColumnIndex(data: any[][], keyword: string): number {
  for (let r = 0; r < Math.min(20, data.length); r++) {
    const row = data[r];
    if (!row) continue;
    for (let c = 0; c < row.length; c++) {
      if (String(row[c] || '').trim() === keyword) return c;
    }
  }
  return -1;
}

/**
 * Robustly searches for an item or category total in the Sales Report.
 */
function findSalesValue(
  data: any[][], 
  type: '>' | '~', 
  matchMode: '{' | '[', 
  keyword: string, 
  returnTarget: 'A' | 'B'
): number {
  const catCol = Math.max(0, getColumnIndex(data, '類別'));
  let itemCol = getColumnIndex(data, '品名');
  if (itemCol === -1) itemCol = getColumnIndex(data, '品項');
  const resolvedItemCol = itemCol !== -1 ? itemCol : 2; // fallback to C
  
  const qtyCol = getColumnIndex(data, '銷售量');
  const amtCol = getColumnIndex(data, '銷售金額');
  
  const targetCol = returnTarget === 'A' ? qtyCol : amtCol;

  let currentCategory = '';
  let total = 0;

  for (let r = 0; r < data.length; r++) {
    const row = data[r];
    if (!row) continue;
    
    const rawCat = String(row[catCol] || '').trim();
    if (rawCat && rawCat !== '類別') {
      currentCategory = rawCat;
    }

    const itemCell = String(row[resolvedItemCol] || '').trim();
    const fullRowStr = row.join(' ');

    let isMatch = false;

    if (type === '>') {
      // Category query: only look at "合計" rows
      const catMatches = matchMode === '{' ? currentCategory === keyword : currentCategory.includes(keyword);
      if (catMatches && fullRowStr.includes('合計')) {
        isMatch = true;
      }
    } else if (type === '~') {
      // Item query: ignore "合計" rows (unless the item being searched explicitly has "合計" in its name)
      if (!fullRowStr.includes('合計') || keyword.includes('合計')) {
        if (matchMode === '{') {
          // Exact match on the cell or any cell in the row
          isMatch = row.some(c => String(c || '').trim() === keyword);
        } else {
          // Partial match
          isMatch = fullRowStr.includes(keyword);
        }
      }
    }

    if (isMatch) {
      if (targetCol !== -1) {
        const val = Number(row[targetCol]);
        if (!isNaN(val)) {
          total += val;
        }
      } else {
        // Fallback: scan for numbers next to the matched keyword
        const matchIdx = row.findIndex(cell => String(cell || '').includes(keyword) || String(cell || '').includes('合計'));
        if (matchIdx !== -1) {
          let numbersFound = 0;
          for (let offset = 1; offset <= 5; offset++) {
            const val = Number(row[matchIdx + offset]);
            if (!isNaN(val)) {
              numbersFound++;
              // Typically: Unit Price -> Qty -> Amount
              if (returnTarget === 'A' && numbersFound === 2) { total += val; break; }
              if (returnTarget === 'B' && numbersFound === 3) { total += val; break; }
            }
          }
        }
      }
    }
  }
  return total;
}

/**
 * Evaluates the powerful query expression syntax.
 * Syntax examples: 
 *   >{長條1}:B   -> Category Exact, Amount
 *   ~[蛋糕]:A   -> Item Partial, Quantity
 */
function evaluateSalesQuery(query: string, salesData: any[][]): number {
  const regex = /([>~])([{\[])([^}\]]+)[}\]]:([AB])/g;
  
  if (!regex.test(query) && !query.match(/([>~])/)) {
    if (!isNaN(Number(query))) return Number(query);
    return 0; // Invalid format
  }

  regex.lastIndex = 0; // reset regex index

  const expr = query.replace(regex, (_, type, bracket, keyword, target) => {
    return String(findSalesValue(salesData, type as '>'|'~', bracket as '{'|'[', keyword, target as 'A'|'B'));
  });

  try {
    const result = new Function('return (' + expr + ');')();
    return Math.max(0, Number(result) || 0);
  } catch (e) {
    console.error("Query evaluation failed for:", query, "Parsed expr:", expr);
    return 0;
  }
}

export async function parseExcelFiles(
  cashReportFile: File | null,
  salesReportFile: File | null,
  config: AppConfig
): Promise<ParsedExcelData> {
  const result: ParsedExcelData = {
    revenue: 0,
    categories: {},
    sales: {},
    combinedSales: {},
    scrap: { '麵包金額': 0, '常溫金額': 0 },
  };

  // 1. Read Cash Report (現金日報表)
  let cashData: any[][] = [];
  if (cashReportFile) {
    const cashBuffer = await cashReportFile.arrayBuffer();
    const cashWb = XLSX.read(cashBuffer, { type: 'array' });
    const cashWs = cashWb.Sheets[cashWb.SheetNames[0]];
    cashData = XLSX.utils.sheet_to_json(cashWs, { header: 1 }) as any[][];

    // Revenue = largest number in the row containing '總計' (at the bottom)
    for (let r = cashData.length - 1; r >= 0; r--) {
      const row = cashData[r];
      if (!row) continue;
      if (row.join(' ').includes('總計')) {
        let maxVal = 0;
        row.forEach(cell => {
          const val = Number(cell);
          if (!isNaN(val) && val > maxVal) maxVal = val;
        });
        if (maxVal > 0) {
          result.revenue = maxVal;
          break;
        }
      }
    }
  }

  // 2. Read Sales Report (銷售日報表)
  let salesData: any[][] = [];
  if (salesReportFile) {
    const salesBuffer = await salesReportFile.arrayBuffer();
    const salesWb = XLSX.read(salesBuffer, { type: 'array' });
    const salesWs = salesWb.Sheets[salesWb.SheetNames[0]];
    salesData = XLSX.utils.sheet_to_json(salesWs, { header: 1 }) as any[][];
  }

  config.categories.forEach(cat => {
    result.categories[cat.displayName] = evaluateSalesQuery(cat.query, salesData);
  });

  config.trackSales.forEach(item => {
    result.sales[item.displayName] = evaluateSalesQuery(item.query, salesData);
  });

  config.combinedSales.forEach(combo => {
    result.combinedSales[combo.displayName] = combo.queries.map(q => evaluateSalesQuery(q, salesData));
  });

  // Extract Scrap manually via query (defaulting to 0 if they don't want to extract it this way)
  result.scrap['麵包金額'] = evaluateSalesQuery('>[報廢]:B', salesData); // Best effort fallback
  result.scrap['常溫金額'] = 0; 

  return result;
}
