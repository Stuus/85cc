import { useState, useEffect } from 'react';
import { SyncModal } from '../components/SyncModal';
import { useConfig } from '../components/ConfigProvider';
import { parseExcelFiles } from '../utils/excelParser';
import type { ParsedExcelData } from '../utils/excelParser';
import { writeTextFile } from '../utils/fileSystem';
import { calculateSHA256 } from '../utils/crypto';
import { safeEvaluate } from '../utils/mathParser';
import { getCurrentMonthDayForDisplay } from '../utils/date';
import { FileDown, RefreshCw, Plus, X, Trash2, Share2 } from 'lucide-react';

interface DateRow {
  id: string;
  date: string;
  quantity: string;
}

export interface ManualInputs {
  date: string;
  pos1Customers: string;
  pos23Customers: string;
  workHours: string;
  manager: string;
  scrapBread: string;
  scrapTemp: string;
  inventory: Record<string, string>;
  inventoryDates: Record<string, DateRow[]>;
  customSales: Record<string, string>;
}

const DEFAULT_MANUAL: ManualInputs = {
  date: getCurrentMonthDayForDisplay(),
  pos1Customers: '',
  pos23Customers: '',
  workHours: '',
  manager: '',
  scrapBread: '',
  scrapTemp: '',
  inventory: {},
  inventoryDates: {},
  customSales: {},
};


export const ReportPage: React.FC<{ dirHandle: FileSystemDirectoryHandle | null }> = ({ dirHandle }) => {
  const { config, updateConfig, isLoading } = useConfig();
  const [cashFile, setCashFile] = useState<File | null>(null);
  const [salesFile, setSalesFile] = useState<File | null>(null);
  const [parsedData, setParsedData] = useState<ParsedExcelData | null>(null);
  const [isSyncModalOpen, setIsSyncModalOpen] = useState(false);
  const [parseStatus, setParseStatus] = useState<'idle' | 'success' | 'error'>('idle');
  
  const [manual, setManual] = useState<ManualInputs>(() => {
    const saved = localStorage.getItem('85cc_manualInputs');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return { 
          ...DEFAULT_MANUAL, 
          ...parsed,
          inventory: parsed.inventory || {},
          inventoryDates: parsed.inventoryDates || {},
          customSales: parsed.customSales || {}
        };
      } catch (e) {
        return DEFAULT_MANUAL;
      }
    }
    return DEFAULT_MANUAL;
  });

  const [generatedText, setGeneratedText] = useState('');

  useEffect(() => {
    localStorage.setItem('85cc_manualInputs', JSON.stringify(manual));
  }, [manual]);

  if (isLoading || !config) return <p>載入中...</p>;

  const handleClearAll = () => {
    if (window.confirm('確定要清除所有手動輸入的暫存資料嗎？')) {
      setManual(DEFAULT_MANUAL);
      localStorage.removeItem('85cc_manualInputs');
      setGeneratedText('');
    }
  };

  const handleParse = async () => {
    if (!cashFile && !salesFile) {
      alert('請至少選擇一份報表！');
      return;
    }
    setParseStatus('idle');
    try {
      const data = await parseExcelFiles(cashFile, salesFile, config);
      setParsedData(data);
      setParseStatus('success');
      // Auto-revert status after 3 seconds for better UX
      setTimeout(() => setParseStatus('idle'), 3000);
    } catch (e) {
      console.error(e);
      setParseStatus('error');
      alert('解析失敗，請確認檔案格式是否正確。');
    }
  };

  const addDateRow = (invName: string) => {
    const current = manual.inventoryDates[invName] || [];
    setManual({
      ...manual,
      inventoryDates: {
        ...manual.inventoryDates,
        [invName]: [...current, { id: crypto.randomUUID(), date: '', quantity: '' }]
      }
    });
  };

  const updateDateRow = (invName: string, id: string, field: 'date' | 'quantity', value: string) => {
    const current = manual.inventoryDates[invName] || [];
    setManual({
      ...manual,
      inventoryDates: {
        ...manual.inventoryDates,
        [invName]: current.map(row => row.id === id ? { ...row, [field]: value } : row)
      }
    });
  };

  const removeDateRow = (invName: string, id: string) => {
    const current = manual.inventoryDates[invName] || [];
    setManual({
      ...manual,
      inventoryDates: {
        ...manual.inventoryDates,
        [invName]: current.filter(row => row.id !== id)
      }
    });
  };

  const handleGenerate = async () => {
    const data = parsedData || {
      revenue: 0,
      categories: {},
      sales: {},
      combinedSales: {},
    };

    let text = `${manual.date}台北景美營業額：${data.revenue}\n`;
    config.categories.forEach(cat => {
      text += `${cat.displayName}：${data.categories[cat.displayName] || 0}\n`;
    });
    let pos23 = manual.pos23Customers;
    if (pos23) {
      try {
        const evalResult = safeEvaluate(pos23);
        if (!isNaN(evalResult) && evalResult > 0) pos23 = String(evalResult);
      } catch(e) {
        console.warn('Error evaluating pos23Customers:', e);
      }
    }
    text += `來客：${manual.pos1Customers}/${pos23}\n`;
    text += `工時：${manual.workHours}\n`;
    text += `值班：${manual.manager}\n\n`;

    text += `銷售\n`;
    const renderedSales = new Set<string>();
    
    config.combinedSales.forEach(combo => {
      const counts = data.combinedSales ? (data.combinedSales[combo.displayName] || []) : [];
      const finalCounts = combo.queries.map((q, i) => {
        if (q === '*') return manual.customSales[`${combo.displayName}_${i}`] || '0';
        return counts[i] || 0;
      });
      text += `${combo.displayName}：${finalCounts.join('/')}\n`;
      combo.queries.forEach(q => renderedSales.add(q));
    });

    config.trackSales.forEach(item => {
      if (!renderedSales.has(item.query)) {
        const val = item.query === '*' ? (manual.customSales[item.displayName] || '0') : (data.sales[item.displayName] || 0);
        text += `${item.displayName}：${val}\n`;
      }
    });

    text += `\n報廢\n`;
    const finalScrapBread = manual.scrapBread || '0';
    const finalScrapTemp = manual.scrapTemp || '0';
    text += `麵包金額：${finalScrapBread}\n`;
    text += `常溫金額：${finalScrapTemp}\n`;

    text += `\n庫存\n`;
    config.inventoryItems.forEach(inv => {
      if (inv.requiresDate) {
        const rows = [...(manual.inventoryDates[inv.name] || [])];
        // Sort by date (assuming format is MM/DD or something sortable)
        rows.sort((a, b) => a.date.localeCompare(b.date));
        
        text += `${inv.name}：\n`;
        if (rows.length === 0) {
          text += `--/-- -\n`;
        } else {
          rows.forEach(r => {
            text += `${r.date || '--/--'} ${r.quantity || '-'}\n`;
          });
        }
        text += '\n'; // Add spacing after date list
      } else {
        const val = manual.inventory[inv.name] || '0';
        text += `${inv.name}：${val}\n`;
      }
    });

    const configStr = JSON.stringify(config);
    const hash = await calculateSHA256(configStr);
    text += `\n---\nConfig SHA-256: ${hash}\n`;

    setGeneratedText(text.trim());
  };

  const handleSave = async () => {
    if (!generatedText) return;
    if (!dirHandle) {
      alert('您正處於手機專用模式，沒有綁定本地資料夾，請使用「分享」功能！');
      return;
    }
    const dateStr = manual.date.replace(/\//g, '');
    const filename = `${dateStr}_回報簡訊.txt`;
    try {
      await writeTextFile(dirHandle, filename, generatedText);
      alert(`已成功儲存為 ${filename}`);
    } catch (e) {
      alert('儲存失敗');
    }
  };

  const handleShare = async () => {
    if (!generatedText) return;
    if (navigator.share) {
      try {
        await navigator.share({
          title: '日結匯報',
          text: generatedText,
        });
      } catch (e) {
        console.error('Share failed', e);
      }
    } else {
      try {
        await navigator.clipboard.writeText(generatedText);
        alert('您的裝置不支援原生分享，已為您將文字複製到剪貼簿！');
      } catch (e) {
        alert('複製失敗');
      }
    }
  };

  return (
    <div className="page-container">
      {/* 左側：檔案與手動輸入 */}
      <div className="glass-panel content-panel" style={{ gap: '15px' }}>
        <div className="header-row">
          <h3 style={{ margin: 0 }}>輸入資料</h3>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <button className="glass-button" onClick={() => setIsSyncModalOpen(true)} style={{ color: '#8b5cf6', borderColor: '#c4b5fd' }}>
              <Share2 size={14} style={{ marginRight: '4px' }} /> 跨裝置同步
            </button>
            <button className="glass-button" onClick={handleClearAll} style={{ color: '#ef4444', borderColor: '#fca5a5' }}>
              <Trash2 size={14} style={{ marginRight: '4px' }} /> 全部清除
            </button>
          </div>
        </div>

        <div className="responsive-grid">
          <div style={{ flex: 1, minWidth: 0 }}>
            <label style={{ fontSize: '0.85em', color: '#6b7280' }}>現金日報表 (.xls)</label>
            <input type="file" accept=".xls,.xlsx" onChange={e => setCashFile(e.target.files?.[0] || null)} className="glass-input" style={{ width: '100%', boxSizing: 'border-box' }} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <label style={{ fontSize: '0.85em', color: '#6b7280' }}>銷售日報表 (.xlsx)</label>
            <input type="file" accept=".xls,.xlsx" onChange={e => setSalesFile(e.target.files?.[0] || null)} className="glass-input" style={{ width: '100%', boxSizing: 'border-box' }} />
          </div>
        </div>
        <button 
          className="glass-button" 
          onClick={handleParse} 
          style={{ 
            background: parseStatus === 'success' ? '#10b981' : (parseStatus === 'error' ? '#ef4444' : '#eff6ff'), 
            borderColor: parseStatus === 'success' ? '#059669' : (parseStatus === 'error' ? '#dc2626' : '#bfdbfe'), 
            color: parseStatus === 'idle' ? '#1d4ed8' : 'white',
            transition: 'all 0.3s ease'
          }}
        >
          {parseStatus === 'success' ? '解析成功 ✓' : (parseStatus === 'error' ? '解析失敗 ✕' : '解析 Excel')}
        </button>

        <hr style={{ borderTop: '1px solid #e5e7eb', width: '100%', margin: '10px 0' }} />

        <div className="responsive-grid">
          <input className="glass-input" placeholder="日期 (如 5/9)" value={manual.date} onChange={e => setManual({...manual, date: e.target.value})} />
          <input className="glass-input" placeholder="值班人員" value={manual.manager} onChange={e => setManual({...manual, manager: e.target.value})} />
          <input className="glass-input" placeholder="來客 Pos1" value={manual.pos1Customers} onChange={e => setManual({...manual, pos1Customers: e.target.value})} />
          <input className="glass-input" placeholder="來客 Pos2+3" value={manual.pos23Customers} onChange={e => setManual({...manual, pos23Customers: e.target.value})} />
          <input className="glass-input" placeholder="總工時" value={manual.workHours} onChange={e => setManual({...manual, workHours: e.target.value})} />
        </div>

        <div className="responsive-grid">
          <input className="glass-input" placeholder="麵包報廢" value={manual.scrapBread} onChange={e => setManual({...manual, scrapBread: e.target.value})} />
          <input className="glass-input" placeholder="常溫報廢" value={manual.scrapTemp} onChange={e => setManual({...manual, scrapTemp: e.target.value})} />
        </div>

        {/* 手動輸入銷售項目 (*) */}
        {(config.trackSales.some(t => t.query === '*') || config.combinedSales.some(c => c.queries.includes('*'))) && (
          <>
            <h4 style={{ margin: '10px 0 0' }}>手動品項輸入</h4>
            <div className="responsive-grid">
              {config.trackSales.filter(t => t.query === '*').map(item => (
                <input 
                  key={item.displayName}
                  className="glass-input" 
                  placeholder={item.displayName} 
                  value={manual.customSales[item.displayName] || ''} 
                  onChange={e => setManual({...manual, customSales: {...manual.customSales, [item.displayName]: e.target.value}})} 
                />
              ))}
              {config.combinedSales.map(combo => 
                combo.queries.map((q, i) => {
                  if (q === '*') {
                    const key = `${combo.displayName}_${i}`;
                    return (
                      <input 
                        key={key}
                        className="glass-input" 
                        placeholder={`${combo.displayName} (項 ${i+1})`} 
                        value={manual.customSales[key] || ''} 
                        onChange={e => setManual({...manual, customSales: {...manual.customSales, [key]: e.target.value}})} 
                      />
                    );
                  }
                  return null;
                })
              )}
            </div>
          </>
        )}

        <h4 style={{ margin: '10px 0 0' }}>盤點庫存</h4>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '350px', overflowY: 'auto', paddingRight: '5px' }}>
          {config.inventoryItems.map(inv => {
            if (inv.requiresDate) {
              const rows = manual.inventoryDates[inv.name] || [];
              return (
                <div key={inv.name} style={{ background: '#f9fafb', padding: '10px', borderRadius: '6px', border: '1px solid #e5e7eb' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <strong style={{ fontSize: '0.9em' }}>{inv.name}</strong>
                    <button className="glass-button" onClick={() => addDateRow(inv.name)} style={{ padding: '2px 6px', fontSize: '0.8em', display: 'flex', alignItems: 'center' }}>
                      <Plus size={12} /> 添加日期
                    </button>
                  </div>
                  {rows.map(row => (
                    <div key={row.id} className="date-row">
                      <input className="glass-input" placeholder="日期 (MM/DD)" style={{ flex: 1, padding: '4px 8px' }} value={row.date} onChange={e => updateDateRow(inv.name, row.id, 'date', e.target.value)} />
                      <input className="glass-input" placeholder="數量" style={{ flex: 1, padding: '4px 8px' }} value={row.quantity} onChange={e => updateDateRow(inv.name, row.id, 'quantity', e.target.value)} />
                      <button className="remove-btn" onClick={() => removeDateRow(inv.name, row.id)}><X size={16} /></button>
                    </div>
                  ))}
                  {rows.length === 0 && <span style={{ fontSize: '0.85em', color: '#9ca3af' }}>尚無日期記錄</span>}
                </div>
              );
            } else {
              return (
                <div key={inv.name} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <label style={{ width: '80px', fontSize: '0.9em' }}>{inv.name}</label>
                  <input 
                    className="glass-input" 
                    placeholder="數量"
                    style={{ flex: 1 }}
                    value={manual.inventory[inv.name] || ''}
                    onChange={e => setManual({...manual, inventory: {...manual.inventory, [inv.name]: e.target.value}})}
                  />
                </div>
              );
            }
          })}
        </div>

        <button className="glass-button" onClick={handleGenerate} style={{ background: '#10b981', color: 'white', borderColor: '#059669', marginTop: '10px' }}>
          <RefreshCw size={16} /> 產生預覽
        </button>
      </div>

      {/* 右側：預覽與輸出 */}
      <div className="glass-panel content-panel">
        <div className="header-row" style={{ marginBottom: '10px' }}>
          <h3 style={{ margin: 0 }}>回報簡訊預覽</h3>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <button className="glass-button" onClick={handleShare} disabled={!generatedText} style={{ display: 'flex', alignItems: 'center', gap: '6px', background: generatedText ? '#8b5cf6' : '#f3f4f6', color: generatedText ? 'white' : '#9ca3af' }}>
              <Share2 size={16} /> 分享
            </button>
            <button className="glass-button" onClick={handleSave} disabled={!generatedText} style={{ display: 'flex', alignItems: 'center', gap: '6px', background: generatedText ? '#3b82f6' : '#f3f4f6', color: generatedText ? 'white' : '#9ca3af' }}>
              <FileDown size={16} /> 寫入目錄
            </button>
          </div>
        </div>
        <textarea
          className="glass-input"
          style={{ flex: 1, minHeight: '600px', resize: 'vertical', fontFamily: 'monospace' }}
          value={generatedText}
          onChange={e => setGeneratedText(e.target.value)}
        />
      </div>

      {isSyncModalOpen && (
        <SyncModal 
          isOpen={isSyncModalOpen} 
          onClose={() => setIsSyncModalOpen(false)} 
          config={config} 
          manualInputs={manual} 
          updateConfig={updateConfig} 
          setManual={setManual} 
        />
      )}
    </div>
  );
};
