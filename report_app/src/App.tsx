import { useState, useEffect } from 'react';
import { requestDirectoryAccess } from './utils/fileSystem';
import { getDirHandleDB, setDirHandleDB, verifyPermission } from './utils/idb';
import { FolderOpen, Settings, FileText, History, Unlock, Smartphone } from 'lucide-react';
import { ConfigProvider } from './components/ConfigProvider';
import { SettingsPage } from './pages/SettingsPage';
import { ReportPage } from './pages/ReportPage';
import { HistoryPage } from './pages/HistoryPage';
import './App.css';

function App() {
  const [dirHandle, setDirHandle] = useState<FileSystemDirectoryHandle | null>(null);
  const [useLocalOnly, setUseLocalOnly] = useState(false);
  const [hasStoredHandle, setHasStoredHandle] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);
  const [activeTab, setActiveTab] = useState<'report' | 'history' | 'settings'>('report');

  useEffect(() => {
    getDirHandleDB().then(async handle => {
      if (handle) {
        setHasStoredHandle(true);
        if (await verifyPermission(handle, false)) {
          setDirHandle(handle);
        }
      }
      setIsInitializing(false);
    });
  }, []);

  const handleSelectDirectory = async () => {
    const handle = await requestDirectoryAccess();
    if (handle) {
      await setDirHandleDB(handle);
      setDirHandle(handle);
      setHasStoredHandle(true);
    }
  };

  const handleRestoreDirectory = async () => {
    const handle = await getDirHandleDB();
    if (handle) {
      if (await verifyPermission(handle, true)) {
        setDirHandle(handle);
      }
    }
  };

  if (isInitializing) {
    return <div style={{ display: 'flex', justifyContent: 'center', marginTop: '20vh' }}><p>載入中...</p></div>;
  }

  if (!dirHandle && !useLocalOnly) {
    return (
      <div className="glass-panel" style={{ maxWidth: '400px', margin: '20vh auto', textAlign: 'center' }}>
        <h2>85度C 日結匯報工具</h2>
        {hasStoredHandle ? (
          <>
            <p>系統已綁定先前的儲存目錄，請授權存取權限以繼續使用。</p>
            <button className="glass-button" onClick={handleRestoreDirectory} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', width: '100%', marginTop: '20px', background: '#3b82f6', color: 'white' }}>
              <Unlock size={20} />
              重新授權目錄
            </button>
            <button onClick={handleSelectDirectory} style={{ background: 'none', border: 'none', color: '#6b7280', marginTop: '15px', cursor: 'pointer', textDecoration: 'underline' }}>
              重新選擇其他目錄
            </button>
            <hr style={{ borderTop: '1px solid #e5e7eb', margin: '20px 0' }} />
            <button className="glass-button" onClick={() => setUseLocalOnly(true)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', width: '100%', background: '#f3f4f6', color: '#4b5563', borderColor: '#d1d5db' }}>
              <Smartphone size={20} />
              免儲存直接進入 (手機盤點專用)
            </button>
          </>
        ) : (
          <>
            <p>為確保您的設定檔與歷史紀錄能妥善保存，請先選擇一個本地資料夾。</p>
            <button className="glass-button" onClick={handleSelectDirectory} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', width: '100%', marginTop: '20px' }}>
              <FolderOpen size={20} />
              選擇儲存目錄
            </button>
            {(!window.showDirectoryPicker) && (
              <p style={{ color: '#ef4444', fontSize: '0.85em', marginTop: '10px' }}>您的瀏覽器 (如 iOS Safari) 不支援資料夾綁定功能。</p>
            )}
            <hr style={{ borderTop: '1px solid #e5e7eb', margin: '20px 0' }} />
            <button className="glass-button" onClick={() => setUseLocalOnly(true)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', width: '100%', background: '#f3f4f6', color: '#4b5563', borderColor: '#d1d5db' }}>
              <Smartphone size={20} />
              免資料夾直接進入 (手機盤點專用)
            </button>
          </>
        )}
      </div>
    );
  }

  return (
    <ConfigProvider dirHandle={dirHandle}>
      <div className="app-container">
        <nav className="glass-panel nav-bar">
          <h3>85度C 匯報系統</h3>
          <div className="nav-links">
            <button className={`glass-button ${activeTab === 'report' ? 'active' : ''}`} onClick={() => setActiveTab('report')}>
              <FileText size={16} /> 製作日報
            </button>
            <button className={`glass-button ${activeTab === 'history' ? 'active' : ''}`} onClick={() => setActiveTab('history')}>
              <History size={16} /> 歷史紀錄
            </button>
            <button className={`glass-button ${activeTab === 'settings' ? 'active' : ''}`} onClick={() => setActiveTab('settings')}>
              <Settings size={16} /> 設定
            </button>
          </div>
        </nav>

        <main className="main-content">
          {activeTab === 'report' && (
            <ReportPage dirHandle={dirHandle} />
          )}
          {activeTab === 'history' && (
            <HistoryPage dirHandle={dirHandle} onRestoreSuccess={() => setActiveTab('report')} />
          )}
          {activeTab === 'settings' && (
            <SettingsPage onChangeDirectory={handleSelectDirectory} />
          )}
        </main>
      </div>
    </ConfigProvider>
  );
}

export default App;
