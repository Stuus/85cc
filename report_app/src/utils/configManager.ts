import { readJsonFile, writeJsonFile, getOrCreateConfigDir, listConfigFiles } from './fileSystem';
import { calculateSHA256 } from './crypto';

export interface AppConfig {
  categories: { displayName: string; query: string }[];
  trackSales: { displayName: string; query: string }[];
  combinedSales: { displayName: string; queries: string[] }[];
  inventoryItems: { name: string; requiresDate: boolean }[];
}

export const DEFAULT_CONFIG: AppConfig = {
  categories: [
    { displayName: '蛋糕', query: ">[長條]:B + >[整膜]:B + >[切片]:B" },
    { displayName: '麵包', query: ">[麵包]:B" },
    { displayName: '飲料', query: ">[飲料]:B - >[咖啡]:B" },
    { displayName: '咖啡', query: ">[咖啡]:B" },
    { displayName: '點心', query: ">[點心]:B" },
    { displayName: '伴手', query: ">[伴手]:B" },
    { displayName: '常溫', query: ">[常溫]:B" },
    { displayName: '其他', query: ">[其他]:B" }
  ],
  trackSales: [
    { displayName: '長條蛋糕', query: "~[長條]:A" },
    { displayName: '貝果系列', query: "~[貝果]:A" },
    { displayName: '蔬翠卷', query: "~[蔬翠卷]:A" },
    { displayName: '年糕系列', query: "~[年糕]:A" },
    { displayName: '芙蓉蛋塔', query: "~[蛋塔]:A" },
    { displayName: '鉑金系列', query: "~[鉑金]:A" },
    { displayName: '焦糖脆皮泡芙', query: "~[泡芙]:A" },
    { displayName: '甜心冰粽', query: "~[冰粽]:A" },
    { displayName: '雲朵生乳燒', query: "~[生乳燒]:A" }
  ],
  combinedSales: [
    { displayName: '杜拜法國/Q餅', queries: ["~[杜拜法國]:A", "~[杜拜Q餅]:A"] },
    { displayName: '荔枝系列/頻香檸檬', queries: ["~[荔枝]:A", "~[頻香檸檬]:A"] },
    { displayName: '杜拜冰沙/青檸', queries: ["~[杜拜冰沙]:A", "~[青檸]:A"] }
  ],
  inventoryItems: [
    { name: '鮮奶', requiresDate: true },
    { name: '奶精', requiresDate: false },
    { name: '義豆', requiresDate: false },
    { name: '厚豆', requiresDate: false },
    { name: '鉑豆', requiresDate: false },
    { name: '多多', requiresDate: false },
    { name: '冰粽-紅豆', requiresDate: true },
    { name: '冰粽-芋頭', requiresDate: true },
    { name: '冰粽-香菜', requiresDate: true }
  ],
};

export function migrateConfig(config: any): AppConfig {
  let merged = { ...DEFAULT_CONFIG, ...config };
  if (merged.trackSales.length > 0 && (merged.trackSales[0] as any).name !== undefined) {
    merged.trackSales = merged.trackSales.map((t: any) => ({
      displayName: t.name || t.displayName,
      query: t.query || `~[${(t.aliases && t.aliases[0]) || t.name}]:A`
    }));
  }
  if (merged.combinedSales.length > 0 && (merged.combinedSales[0] as any).matchNames !== undefined) {
    merged.combinedSales = merged.combinedSales.map((c: any) => ({
      displayName: c.displayName,
      queries: c.queries || c.matchNames.map((m: string) => `~[${m}]:A`)
    }));
  }
  return merged;
}

export async function loadLatestBackupConfig(dirHandle: FileSystemDirectoryHandle): Promise<AppConfig | null> {
  const configDir = await getOrCreateConfigDir(dirHandle);
  if (!configDir) return null;
  
  const files = await listConfigFiles(dirHandle);
  if (files.length === 0) return null;
  
  // Filter for current month and sort
  const currentMonth = new Date().toLocaleDateString('en-US', { month: '2-digit' }); // '06'
  const monthFiles = files.filter(f => f.startsWith(currentMonth));
  
  let targetFile = '';
  if (monthFiles.length > 0) {
    targetFile = monthFiles.sort().reverse()[0]; // Last one alphabetically
  } else {
    targetFile = files.sort().reverse()[0]; // Fallback to absolute latest
  }
  
  const config = await readJsonFile(configDir, targetFile);
  return config ? migrateConfig(config) : null;
}

const INDEX_FILENAME = '.sha256_index.json';

export async function updateHashIndex(dirHandle: FileSystemDirectoryHandle, hash: string, filename: string): Promise<void> {
  const configDir = await getOrCreateConfigDir(dirHandle);
  if (!configDir) return;
  
  let index: Record<string, string> = {};
  const existing = await readJsonFile(configDir, INDEX_FILENAME);
  if (existing) {
    index = existing;
  }
  
  // 移除舊的 Hash 對應，避免被覆蓋的舊檔仍殘留在索引中
  Object.keys(index).forEach(k => {
    if (index[k] === filename) {
      delete index[k];
    }
  });
  
  index[hash] = filename;
  await writeJsonFile(configDir, INDEX_FILENAME, index);
}

export async function findConfigByHash(dirHandle: FileSystemDirectoryHandle, hash: string): Promise<string | null> {
  const configDir = await getOrCreateConfigDir(dirHandle);
  if (!configDir) return null;
  
  const index = await readJsonFile(configDir, INDEX_FILENAME);
  if (index && index[hash]) {
    return index[hash];
  }
  return null;
}

export async function saveBackupConfig(dirHandle: FileSystemDirectoryHandle, filename: string, config: AppConfig): Promise<void> {
  const configDir = await getOrCreateConfigDir(dirHandle);
  if (configDir) {
    await writeJsonFile(configDir, filename, config);
    const hash = await calculateSHA256(JSON.stringify(config));
    await updateHashIndex(dirHandle, hash, filename);
  }
}
