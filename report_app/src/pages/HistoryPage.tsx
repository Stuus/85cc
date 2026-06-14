import { useState, useEffect, useCallback } from 'react';
import { listTextFiles } from '../utils/fileSystem';
import { FileText, RefreshCw } from 'lucide-react';
import { useConfig } from '../components/ConfigProvider';

export const HistoryPage: React.FC<{ dirHandle: FileSystemDirectoryHandle | null, onRestoreSuccess?: () => void }> = ({ dirHandle, onRestoreSuccess }) => {
  const { restoreConfigFromHash } = useConfig();
  const [files, setFiles] = useState<string[]>([]);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [fileContent, setFileContent] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);

  const fetchFiles = useCallback(async () => {
    if (!dirHandle) return;
    const list = await listTextFiles(dirHandle);
    setFiles(list.sort().reverse()); // newest first usually if named by date
  }, [dirHandle]);

  useEffect(() => {
    fetchFiles();
  }, [fetchFiles]);

  const handleSelectFile = async (filename: string) => {
    setSelectedFile(filename);
    setIsLoading(true);
    try {
      if (!dirHandle) return;
      // we can read text file using similar logic to readJsonFile
      const fileHandle = await dirHandle.getFileHandle(filename);
      const file = await fileHandle.getFile();
      const text = await file.text();
      setFileContent(text);
    } catch (e) {
      console.error(e);
      setFileContent('無法讀取檔案內容');
    }
    setIsLoading(false);
  };

  let extractedHash: string | null = null;
  if (fileContent) {
    const match = fileContent.match(/Config SHA-256: ([a-f0-9]+)/);
    if (match) extractedHash = match[1];
  }

  const handleRestore = async () => {
    if (!extractedHash) return;
    const success = await restoreConfigFromHash(extractedHash);
    if (success) {
      alert('已成功載入該歷史紀錄對應的設定檔！');
      if (onRestoreSuccess) onRestoreSuccess();
    } else {
      alert('無法還原設定檔：此歷史紀錄對應的設定檔已被刪除或無法找到，因此無法使用當時的設定來重建日報。');
    }
  };

  return (
    <div className="page-container">
      <div className="glass-panel sidebar-panel" style={{ overflowY: 'auto' }}>
        <div className="header-row">
          <h3 style={{ margin: 0 }}>歷史紀錄</h3>
          <button className="glass-button" onClick={fetchFiles} style={{ padding: '0.4em 0.8em' }}>
            <RefreshCw size={14} />
          </button>
        </div>
        {(!dirHandle) ? (
          <p style={{ color: '#aaa', fontSize: '0.9em', padding: '10px' }}>手機無資料夾模式不支援讀取歷史紀錄。</p>
        ) : files.length === 0 ? (
          <p style={{ color: '#aaa', fontSize: '0.9em' }}>目前沒有任何 txt 檔案</p>
        ) : (
          <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
            {files.map(f => (
              <li key={f} style={{ marginBottom: '8px' }}>
                <button 
                  className={`glass-button ${selectedFile === f ? 'active' : ''}`}
                  onClick={() => handleSelectFile(f)}
                  style={{ width: '100%', textAlign: 'left', display: 'flex', alignItems: 'center', gap: '8px' }}
                >
                  <FileText size={14} />
                  {f}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="glass-panel content-panel">
        <div className="header-row">
          <h3 style={{ margin: 0 }}>{selectedFile || '請選擇一個歷史紀錄'}</h3>
          {extractedHash && (
            <button className="glass-button" onClick={handleRestore} style={{ background: '#3b82f6', color: 'white', borderColor: '#2563eb' }}>
              使用此紀錄的設定檔來製作新日報
            </button>
          )}
        </div>
        <textarea
          className="glass-input"
          style={{ flex: 1, minHeight: '400px', resize: 'vertical', fontFamily: 'monospace' }}
          value={isLoading ? '載入中...' : fileContent}
          readOnly
        />
      </div>
    </div>
  );
};
