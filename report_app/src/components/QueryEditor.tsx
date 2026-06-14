import React from 'react';
import { Plus, X } from 'lucide-react';

export const parseQueryTokens = (query: string) => {
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

export const QueryEditor: React.FC<{ value: string, onChange: (val: string) => void, disabled?: boolean }> = ({ value, onChange, disabled }) => {
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
