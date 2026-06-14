import React, { useState, useEffect } from 'react';
import { useConfig } from '../components/ConfigProvider';
import type { AppConfig } from '../utils/configManager';
import { Save, Plus, X, Type, Code, FolderOpen, GripVertical, ArrowUpDown } from 'lucide-react';

const parseQueryTokens = (query: string) => {
  if (!query) return [{ operator: '', text: '' }];
  const tokens = [];
  let currentToken = '';
  let currentOp = '';
  let inBracket = false;
  
  for (let i = 0; i < query.length; i++) {
    const char = query[i];
    if (char === '[' || char === '{') inBracket = true;
    if (char === ']' || char === '}') inBracket = false;
    
    if (!inBracket && (char === '+' || char === '-')) {
      if (currentToken.trim() || currentOp) {
        tokens.push({ operator: currentOp, text: currentToken.trim() });
      }
      currentOp = char;
      currentToken = '';
    } else {
      currentToken += char;
    }
  }
  if (currentToken.trim() || currentOp || tokens.length === 0) {
    tokens.push({ operator: currentOp, text: currentToken.trim() });
  }
  return tokens;
};

const QueryEditor: React.FC<{ value: string, onChange: (val: string) => void, disabled?: boolean }> = ({ value, onChange, disabled }) => {
  const tokens = parseQueryTokens(value);

  const updateToken = (index: number, newText: string, newOp?: string) => {
    const newTokens = [...tokens];
    newTokens[index].text = newText;
    if (newOp !== undefined) newTokens[index].operator = newOp;
    onChange(newTokens.map((t, i) => i === 0 ? t.text : `${t.operator || '+'} ${t.text}`).join(' '));
  };

  const addToken = () => {
    const newTokens = [...tokens, { operator: '+', text: '' }];
    onChange(newTokens.map((t, i) => i === 0 ? t.text : `${t.operator || '+'} ${t.text}`).join(' '));
  };

  const removeToken = (index: number) => {
    const newTokens = tokens.filter((_, i) => i !== index);
    if (newTokens.length === 0) {
      onChange('');
    } else {
      newTokens[0].operator = '';
      onChange(newTokens.map((t, i) => i === 0 ? t.text : `${t.operator || '+'} ${t.text}`).join(' '));
    }
  };

  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'center', flex: 1, opacity: disabled ? 0.7 : 1 }}>
      {tokens.map((token, index) => (
        <div key={index} style={{ display: 'flex', alignItems: 'center', gap: '4px', background: disabled ? '#f3f4f6' : '#fff', padding: '2px 4px', borderRadius: '4px', border: '1px solid #d1d5db' }}>
          {index > 0 && (
            <select 
              value={token.operator || '+'} 
              onChange={e => updateToken(index, token.text, e.target.value)}
              disabled={disabled}
              style={{ border: 'none', background: '#f3f4f6', outline: 'none', cursor: disabled ? 'not-allowed' : 'pointer', fontWeight: 'bold', padding: '2px 4px', borderRadius: '4px' }}
            >
              <option value="+">+</option>
              <option value="-">-</option>
            </select>
          )}
          <input 
            style={{ border: 'none', outline: 'none', width: Math.max(80, token.text.length * 8) + 'px', minWidth: '80px', padding: '4px', fontFamily: 'monospace', background: 'transparent' }} 
            placeholder=">[類別]:B"
            value={token.text} 
            onChange={e => updateToken(index, e.target.value, token.operator)} 
            disabled={disabled}
            readOnly={disabled}
          />
          {!disabled && <button className="remove-btn" onClick={() => removeToken(index)} style={{ padding: '2px' }}><X size={14}/></button>}
        </div>
      ))}
      {!disabled && <button className="glass-button" onClick={addToken} style={{ padding: '2px 6px', fontSize: '0.8em', background: '#eff6ff', borderColor: '#bfdbfe', color: '#1d4ed8' }}><Plus size={14}/></button>}
    </div>
  );
};

export const SettingsPage: React.FC<{ onChangeDirectory?: () => void }> = ({ onChangeDirectory }) => {
  const { config, updateConfig, isLoading, loadBackup, getAvailableBackups } = useConfig();
  const [localConfig, setLocalConfig] = useState<AppConfig | null>(null);
  const [jsonText, setJsonText] = useState('');
  const [mode, setMode] = useState<'visual' | 'json'>('visual');
  const [backups, setBackups] = useState<string[]>([]);
  const [backupFilename, setBackupFilename] = useState('');
  const [isReorderMode, setIsReorderMode] = useState(false);
  const [draggingItem, setDraggingItem] = useState<{ type: string, index: number } | null>(null);

  useEffect(() => {
    getAvailableBackups().then(setBackups);
    setBackupFilename(`${new Date().toLocaleDateString('en-US', { month: '2-digit', day: '2-digit' }).replace('/', '-')}.json`);
  }, [getAvailableBackups]);

  useEffect(() => {
    if (config && !localConfig) {
      setLocalConfig(config);
      setJsonText(JSON.stringify(config, null, 2));
    }
  }, [config]);

  if (isLoading || !localConfig) {
    return <p>載入設定檔中...</p>;
  }

  // --- Drag and Drop Handlers ---
  const handleDragStart = (type: string, index: number) => {
    setDraggingItem({ type, index });
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault(); // necessary to allow drop
  };

  const handleDrop = (e: React.DragEvent, targetType: string, targetIndex: number) => {
    e.preventDefault();
    if (!draggingItem || draggingItem.type !== targetType || draggingItem.index === targetIndex || !localConfig) {
      setDraggingItem(null);
      return;
    }
    
    const sourceIndex = draggingItem.index;
    const arr = [...localConfig[targetType as keyof AppConfig] as any[]];
    const [removed] = arr.splice(sourceIndex, 1);
    arr.splice(targetIndex, 0, removed);
    
    setLocalConfig({ ...localConfig, [targetType]: arr });
    setDraggingItem(null);
  };

  // --- Handlers ---
  const handleAddCategory = () => setLocalConfig({ ...localConfig, categories: [...localConfig.categories, { displayName: '', query: '' }] });
  const handleUpdateCategory = (idx: number, field: 'displayName'|'query', val: string) => {
    const arr = [...localConfig.categories];
    arr[idx][field] = val;
    setLocalConfig({ ...localConfig, categories: arr });
  };
  const handleRemoveCategory = (idx: number) => {
    setLocalConfig({ ...localConfig, categories: localConfig.categories.filter((_, i) => i !== idx) });
  };

  const handleAddTrackSale = () => setLocalConfig({ ...localConfig, trackSales: [...localConfig.trackSales, { displayName: '', query: '' }] });
  const handleUpdateTrackSale = (idx: number, field: 'displayName'|'query', val: string) => {
    const arr = [...localConfig.trackSales];
    arr[idx][field] = val;
    setLocalConfig({ ...localConfig, trackSales: arr });
  };
  const handleRemoveTrackSale = (idx: number) => {
    setLocalConfig({ ...localConfig, trackSales: localConfig.trackSales.filter((_, i) => i !== idx) });
  };

  const handleAddCombinedSale = () => setLocalConfig({ ...localConfig, combinedSales: [...localConfig.combinedSales, { displayName: '', queries: [] }] });
  const handleUpdateCombinedSaleName = (idx: number, val: string) => {
    const arr = [...localConfig.combinedSales];
    arr[idx].displayName = val;
    setLocalConfig({ ...localConfig, combinedSales: arr });
  };
  const handleUpdateCombinedSaleQuery = (comboIdx: number, qIdx: number, val: string) => {
    const arr = [...localConfig.combinedSales];
    arr[comboIdx].queries[qIdx] = val;
    setLocalConfig({ ...localConfig, combinedSales: arr });
  };
  const handleAddCombinedSaleQuery = (comboIdx: number) => {
    const arr = [...localConfig.combinedSales];
    arr[comboIdx].queries.push('');
    setLocalConfig({ ...localConfig, combinedSales: arr });
  };
  const handleRemoveCombinedSaleQuery = (comboIdx: number, qIdx: number) => {
    const arr = [...localConfig.combinedSales];
    arr[comboIdx].queries = arr[comboIdx].queries.filter((_, i) => i !== qIdx);
    setLocalConfig({ ...localConfig, combinedSales: arr });
  };
  const handleRemoveCombinedSale = (idx: number) => {
    setLocalConfig({ ...localConfig, combinedSales: localConfig.combinedSales.filter((_, i) => i !== idx) });
  };

  const handleAddInventory = () => setLocalConfig({ ...localConfig, inventoryItems: [...localConfig.inventoryItems, { name: '', requiresDate: false }] });
  const handleUpdateInventoryName = (idx: number, val: string) => {
    const arr = [...localConfig.inventoryItems];
    arr[idx].name = val;
    setLocalConfig({ ...localConfig, inventoryItems: arr });
  };
  const handleUpdateInventoryRequiresDate = (idx: number, val: boolean) => {
    const arr = [...localConfig.inventoryItems];
    arr[idx].requiresDate = val;
    setLocalConfig({ ...localConfig, inventoryItems: arr });
  };
  const handleRemoveInventory = (idx: number) => {
    setLocalConfig({ ...localConfig, inventoryItems: localConfig.inventoryItems.filter((_, i) => i !== idx) });
  };

  const handleSwitchToJson = () => {
    setJsonText(JSON.stringify(localConfig, null, 2));
    setMode('json');
  };

  const handleSwitchToVisual = () => {
    try {
      const parsed = JSON.parse(jsonText);
      setLocalConfig(parsed);
      setMode('visual');
    } catch (e) {
      alert('JSON 格式錯誤，無法切換為視覺化模式。請先修正格式。');
    }
  };

  const handleSave = async () => {
    try {
      let finalConfig = localConfig;
      if (mode === 'json') {
        finalConfig = JSON.parse(jsonText);
        setLocalConfig(finalConfig);
      }
      await updateConfig(finalConfig, backupFilename || undefined);
      if (backupFilename) {
        getAvailableBackups().then(setBackups);
      }
      alert('設定檔已成功儲存！');
    } catch (e) {
      alert('JSON 格式錯誤，請檢查您的輸入。');
    }
  };

  return (
    <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', height: '100%', padding: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
          <h2 style={{ margin: 0 }}>設定檔管理</h2>
          <div style={{ display: 'flex', border: '1px solid #d1d5db', borderRadius: '6px', overflow: 'hidden' }}>
            <button 
              onClick={handleSwitchToVisual} 
              style={{ background: mode === 'visual' ? '#e5e7eb' : '#fff', border: 'none', padding: '6px 12px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px' }}
            >
              <Type size={14} /> 視覺化編輯
            </button>
            <button 
              onClick={handleSwitchToJson} 
              style={{ background: mode === 'json' ? '#e5e7eb' : '#fff', border: 'none', borderLeft: '1px solid #d1d5db', padding: '6px 12px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px' }}
            >
              <Code size={14} /> JSON 原始碼
            </button>
            {mode === 'visual' && (
              <button 
                onClick={() => setIsReorderMode(!isReorderMode)} 
                style={{ background: isReorderMode ? '#bfdbfe' : '#fff', color: isReorderMode ? '#1e3a8a' : 'inherit', border: 'none', borderLeft: '1px solid #d1d5db', padding: '6px 12px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px' }}
              >
                <ArrowUpDown size={14} /> 調整順序
              </button>
            )}
          </div>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          {onChangeDirectory && (
            <button className="glass-button" onClick={onChangeDirectory} style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#f9fafb', color: '#4b5563', borderColor: '#d1d5db' }}>
              <FolderOpen size={16} /> 更改儲存目錄
            </button>
          )}
          <button className="glass-button" onClick={handleSave} style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#10b981', color: 'white', borderColor: '#059669' }}>
            <Save size={16} /> 儲存設定
          </button>
        </div>
      </div>

      {mode === 'json' ? (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          <p style={{ fontSize: '0.9em', color: '#6b7280', margin: '0 0 10px' }}>您可以直接貼上設定檔，切換回「視覺化編輯」即可預覽。</p>
          <textarea
            className="glass-input"
            style={{ flex: 1, minHeight: '400px', fontFamily: 'monospace', resize: 'vertical' }}
            value={jsonText}
            onChange={(e) => setJsonText(e.target.value)}
          />
        </div>
      ) : (
        <div style={{ flex: 1, overflowY: 'auto', paddingRight: '10px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          <div style={{ background: '#f9fafb', padding: '15px', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
            <h3 style={{ marginTop: 0, marginBottom: '10px', fontSize: '1.1em' }}>備份與版本管理</h3>
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
              <div style={{ flex: 1, minWidth: '200px' }}>
                <label style={{ fontSize: '0.85em', color: '#6b7280', display: 'block', marginBottom: '4px' }}>讀取歷史備份</label>
                <select 
                  className="glass-input" 
                  style={{ width: '100%', padding: '8px' }}
                  onChange={(e) => {
                    if (e.target.value) {
                      if (window.confirm(`確定要載入 ${e.target.value} 嗎？目前未儲存的變更將會遺失。`)) {
                        loadBackup(e.target.value).then(() => {
                          setBackupFilename(e.target.value);
                          alert('已載入設定檔');
                        });
                      }
                    }
                  }}
                  value=""
                >
                  <option value="">-- 選擇備份檔載入 --</option>
                  {backups.map(b => <option key={b} value={b}>{b}</option>)}
                </select>
              </div>
              
              <div style={{ flex: 1, minWidth: '200px' }}>
                <label style={{ fontSize: '0.85em', color: '#6b7280', display: 'block', marginBottom: '4px' }}>儲存備份檔名</label>
                <input 
                  className="glass-input" 
                  style={{ width: '100%', padding: '8px' }}
                  placeholder="06-15.json" 
                  value={backupFilename} 
                  onChange={e => setBackupFilename(e.target.value)} 
                />
              </div>
            </div>
            <p style={{ fontSize: '0.8em', color: '#6b7280', margin: '10px 0 0 0' }}>提示：若無輸入檔名，將僅儲存於本地瀏覽器 (localStorage) 中。設定檔會自動同步到目錄下的 `config/` 資料夾作為備份。</p>
          </div>

          <div style={{ background: '#eff6ff', padding: '15px', borderRadius: '8px', border: '1px solid #bfdbfe' }}>
            <h4 style={{ margin: '0 0 10px 0', color: '#1e3a8a' }}>📊 查詢表達式語法提示</h4>
            <ul style={{ margin: 0, paddingLeft: '20px', fontSize: '0.85em', color: '#1e40af' }}>
              <li><b>符號</b>：<code>&gt;</code> 代表尋找「類別」、<code>~</code> 代表尋找「品項」</li>
              <li><b>匹配</b>：<code>&#123;名稱&#125;</code> 代表完全一樣、<code>[名稱]</code> 代表名稱含有即可</li>
              <li><b>數值</b>：<code>:A</code> 代表抓取銷售量、<code>:B</code> 代表抓取銷售金額</li>
              <li><b>手動輸入</b>：輸入 <code>*</code> 代表該項目不讀 Excel，會在首頁產生「手動輸入框」讓您手寫數字</li>
              <li><b>範例 1</b>：<code>&gt;&#123;長條1&#125;:B</code> (抓取"長條1"這個類別的合計銷售金額)</li>
              <li><b>範例 2</b>：<code>~[蛋糕]:A</code> (抓取名稱含有"蛋糕"的全部品項的銷售量總和)</li>
              <li><b>算式</b>：您可以點擊下方右側的 `+` 來自由組合算式，例如 `&gt;[飲料]:B` <code>-</code> `&gt;[咖啡]:B`</li>
            </ul>
          </div>

          {/* Categories */}
          <div style={{ background: '#f9fafb', padding: '15px', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
            <h3 style={{ marginTop: 0, marginBottom: '10px', fontSize: '1.1em' }}>各分類營業額 (Categories)</h3>
            {localConfig.categories.map((cat, idx) => (
              <div 
                key={idx} 
                draggable={isReorderMode}
                onDragStart={() => handleDragStart('categories', idx)}
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, 'categories', idx)}
                style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px', opacity: draggingItem?.type === 'categories' && draggingItem?.index === idx ? 0.5 : 1, cursor: isReorderMode ? 'grab' : 'default', background: isReorderMode ? '#fff' : 'transparent', padding: isReorderMode ? '4px' : '0', borderRadius: '6px', border: isReorderMode ? '1px dashed #d1d5db' : 'none' }}
              >
                {isReorderMode && <GripVertical size={16} color="#9ca3af" style={{ cursor: 'grab' }} />}
                <input className="glass-input" style={{ width: '150px', background: isReorderMode ? '#f3f4f6' : '#fff' }} placeholder="顯示名稱" value={cat.displayName} onChange={e => handleUpdateCategory(idx, 'displayName', e.target.value)} disabled={isReorderMode} />
                <QueryEditor value={cat.query} onChange={val => handleUpdateCategory(idx, 'query', val)} disabled={isReorderMode} />
                {!isReorderMode && <button className="remove-btn" onClick={() => handleRemoveCategory(idx)}><X size={18} /></button>}
              </div>
            ))}
            {!isReorderMode && <button className="glass-button" onClick={handleAddCategory} style={{ display: 'flex', alignItems: 'center', gap: '5px' }}><Plus size={14} /> 新增分類</button>}
          </div>

          {/* Track Sales */}
          <div style={{ background: '#f9fafb', padding: '15px', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
            <h3 style={{ marginTop: 0, marginBottom: '10px', fontSize: '1.1em' }}>追蹤單一品項銷售 (Track Sales)</h3>
            {localConfig.trackSales.map((item, idx) => (
              <div 
                key={idx}
                draggable={isReorderMode}
                onDragStart={() => handleDragStart('trackSales', idx)}
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, 'trackSales', idx)}
                style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px', opacity: draggingItem?.type === 'trackSales' && draggingItem?.index === idx ? 0.5 : 1, cursor: isReorderMode ? 'grab' : 'default', background: isReorderMode ? '#fff' : 'transparent', padding: isReorderMode ? '4px' : '0', borderRadius: '6px', border: isReorderMode ? '1px dashed #d1d5db' : 'none' }}
              >
                {isReorderMode && <GripVertical size={16} color="#9ca3af" style={{ cursor: 'grab' }} />}
                <input className="glass-input" style={{ width: '150px', background: isReorderMode ? '#f3f4f6' : '#fff' }} placeholder="顯示名稱" value={item.displayName} onChange={e => handleUpdateTrackSale(idx, 'displayName', e.target.value)} disabled={isReorderMode} />
                <QueryEditor value={item.query} onChange={val => handleUpdateTrackSale(idx, 'query', val)} disabled={isReorderMode} />
                {!isReorderMode && <button className="remove-btn" onClick={() => handleRemoveTrackSale(idx)}><X size={18} /></button>}
              </div>
            ))}
            {!isReorderMode && <button className="glass-button" onClick={handleAddTrackSale} style={{ display: 'flex', alignItems: 'center', gap: '5px' }}><Plus size={14} /> 新增品項</button>}
          </div>

          {/* Combined Sales */}
          <div style={{ background: '#f9fafb', padding: '15px', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
            <h3 style={{ marginTop: 0, marginBottom: '10px', fontSize: '1.1em' }}>組合顯示品項 (Combined Sales)</h3>
            <p style={{ fontSize: '0.85em', color: '#6b7280', marginBottom: '10px' }}>需合併在同一行顯示的品項 (如：杜拜法國/Q餅)。</p>
            {localConfig.combinedSales.map((item, comboIdx) => (
              <div 
                key={comboIdx}
                draggable={isReorderMode}
                onDragStart={() => handleDragStart('combinedSales', comboIdx)}
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, 'combinedSales', comboIdx)}
                style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', marginBottom: '15px', padding: '10px', background: '#fff', borderRadius: '6px', border: isReorderMode ? '1px dashed #3b82f6' : '1px solid #d1d5db', opacity: draggingItem?.type === 'combinedSales' && draggingItem?.index === comboIdx ? 0.5 : 1, cursor: isReorderMode ? 'grab' : 'default' }}
              >
                {isReorderMode && <div style={{ paddingTop: '8px', cursor: 'grab' }}><GripVertical size={16} color="#9ca3af" /></div>}
                <input className="glass-input" style={{ width: '150px', background: isReorderMode ? '#f3f4f6' : '#fff' }} placeholder="顯示名稱 (如: 杜拜/Q餅)" value={item.displayName} onChange={e => handleUpdateCombinedSaleName(comboIdx, e.target.value)} disabled={isReorderMode} />
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {item.queries.map((q, qIdx) => (
                    <div key={qIdx} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '0.8em', color: '#6b7280' }}>項目 {qIdx + 1}</span>
                      <QueryEditor value={q} onChange={val => handleUpdateCombinedSaleQuery(comboIdx, qIdx, val)} disabled={isReorderMode} />
                      {!isReorderMode && <button className="remove-btn" onClick={() => handleRemoveCombinedSaleQuery(comboIdx, qIdx)}><X size={16} /></button>}
                    </div>
                  ))}
                  {!isReorderMode && <button className="glass-button" onClick={() => handleAddCombinedSaleQuery(comboIdx)} style={{ alignSelf: 'flex-start', fontSize: '0.8em', padding: '4px 8px' }}><Plus size={12} /> 加入組合項目</button>}
                </div>
                {!isReorderMode && <button className="remove-btn" onClick={() => handleRemoveCombinedSale(comboIdx)}><X size={18} /></button>}
              </div>
            ))}
            {!isReorderMode && <button className="glass-button" onClick={handleAddCombinedSale} style={{ display: 'flex', alignItems: 'center', gap: '5px' }}><Plus size={14} /> 新增組合</button>}
          </div>

          {/* Inventory Items */}
          <div style={{ background: '#f9fafb', padding: '15px', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
            <h3 style={{ marginTop: 0, marginBottom: '10px', fontSize: '1.1em' }}>庫存盤點項目 (Inventory Items)</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '15px' }}>
              {localConfig.inventoryItems.map((item, idx) => (
                <div 
                  key={idx}
                  draggable={isReorderMode}
                  onDragStart={() => handleDragStart('inventoryItems', idx)}
                  onDragOver={handleDragOver}
                  onDrop={(e) => handleDrop(e, 'inventoryItems', idx)}
                  style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#fff', padding: '8px', borderRadius: '6px', border: isReorderMode ? '1px dashed #3b82f6' : '1px solid #e5e7eb', opacity: draggingItem?.type === 'inventoryItems' && draggingItem?.index === idx ? 0.5 : 1, cursor: isReorderMode ? 'grab' : 'default' }}
                >
                  {isReorderMode && <GripVertical size={16} color="#9ca3af" style={{ cursor: 'grab' }} />}
                  <input className="glass-input" style={{ flex: 1, minWidth: '0', background: isReorderMode ? '#f3f4f6' : '#fff' }} placeholder="如: 鮮奶" value={item.name} onChange={e => handleUpdateInventoryName(idx, e.target.value)} disabled={isReorderMode} />
                  <label style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.8em', cursor: isReorderMode ? 'not-allowed' : 'pointer', opacity: isReorderMode ? 0.6 : 1 }}>
                    <input type="checkbox" checked={item.requiresDate} onChange={e => handleUpdateInventoryRequiresDate(idx, e.target.checked)} disabled={isReorderMode} />
                    日期
                  </label>
                  {!isReorderMode && <button className="remove-btn" onClick={() => handleRemoveInventory(idx)} style={{ padding: '2px' }}><X size={16} /></button>}
                </div>
              ))}
            </div>
            {!isReorderMode && <button className="glass-button" onClick={handleAddInventory} style={{ display: 'flex', alignItems: 'center', gap: '5px', marginTop: '15px' }}><Plus size={14} /> 新增庫存項目</button>}
          </div>

        </div>
      )}
    </div>
  );
};
