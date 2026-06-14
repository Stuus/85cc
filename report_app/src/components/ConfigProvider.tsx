import React, { createContext, useContext, useState, useEffect } from 'react';
import { loadLatestBackupConfig, saveBackupConfig, DEFAULT_CONFIG, migrateConfig, findConfigByHash } from '../utils/configManager';
import { readJsonFile, listConfigFiles, renameConfigFile, getOrCreateConfigDir } from '../utils/fileSystem';
import type { AppConfig } from '../utils/configManager';

interface ConfigContextType {
  config: AppConfig | null;
  updateConfig: (newConfig: AppConfig, saveBackupAs?: string) => Promise<void>;
  isLoading: boolean;
  loadBackup: (filename: string) => Promise<void>;
  getAvailableBackups: () => Promise<string[]>;
  renameBackup: (oldName: string, newName: string) => Promise<boolean>;
  restoreConfigFromHash: (hash: string) => Promise<boolean>;
}

const ConfigContext = createContext<ConfigContextType>({
  config: null,
  updateConfig: async () => {},
  isLoading: true,
  loadBackup: async () => {},
  getAvailableBackups: async () => [],
  renameBackup: async () => false,
  restoreConfigFromHash: async () => false,
});

export const useConfig = () => useContext(ConfigContext);

interface ConfigProviderProps {
  dirHandle: FileSystemDirectoryHandle | null;
  children: React.ReactNode;
}

export const ConfigProvider: React.FC<ConfigProviderProps> = ({ dirHandle, children }) => {
  const [config, setConfig] = useState<AppConfig | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function init() {
      setIsLoading(true);
      let loaded: any = null;
      
      const saved = localStorage.getItem('localAppConfig');
      if (saved) {
        try {
          loaded = JSON.parse(saved);
        } catch(e) {}
      }
      
      if (!loaded && dirHandle) {
        loaded = await loadLatestBackupConfig(dirHandle);
      }

      const finalConfig = loaded ? migrateConfig(loaded) : DEFAULT_CONFIG;
      setConfig(finalConfig);
      localStorage.setItem('localAppConfig', JSON.stringify(finalConfig));
      
      setIsLoading(false);
    }
    init();
  }, [dirHandle]);

  const updateConfig = async (newConfig: AppConfig, saveBackupAs?: string) => {
    setConfig(newConfig);
    localStorage.setItem('localAppConfig', JSON.stringify(newConfig));
    
    if (dirHandle && saveBackupAs) {
      await saveBackupConfig(dirHandle, saveBackupAs, newConfig);
    }
  };

  const loadBackup = async (filename: string) => {
    if (!dirHandle) return;
    const configDir = await getOrCreateConfigDir(dirHandle);
    if (!configDir) return;
    const data = await readJsonFile(configDir, filename);
    if (data) {
      const migrated = migrateConfig(data);
      setConfig(migrated);
      localStorage.setItem('localAppConfig', JSON.stringify(migrated));
    }
  };

  const getAvailableBackups = async () => {
    if (!dirHandle) return [];
    return await listConfigFiles(dirHandle);
  };

  const renameBackup = async (oldName: string, newName: string) => {
    if (!dirHandle) return false;
    return await renameConfigFile(dirHandle, oldName, newName);
  };

  const restoreConfigFromHash = async (hash: string): Promise<boolean> => {
    if (!dirHandle) return false;
    const filename = await findConfigByHash(dirHandle, hash);
    if (!filename) return false;
    
    const configDir = await getOrCreateConfigDir(dirHandle);
    if (!configDir) return false;
    
    try {
      const data = await readJsonFile(configDir, filename);
      if (data) {
        const migrated = migrateConfig(data);
        setConfig(migrated);
        localStorage.setItem('localAppConfig', JSON.stringify(migrated));
        return true;
      }
    } catch (e) {
      console.error(e);
    }
    return false;
  };

  return (
    <ConfigContext.Provider value={{ config, updateConfig, isLoading, loadBackup, getAvailableBackups, renameBackup, restoreConfigFromHash }}>
      {children}
    </ConfigContext.Provider>
  );
};
