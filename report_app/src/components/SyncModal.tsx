import React, { useState, useEffect, useRef } from 'react';
import Peer from 'peerjs';
import { X, Send, Download, Smartphone, Laptop, CheckCircle, AlertCircle } from 'lucide-react';
import type { AppConfig } from '../utils/configManager';
import type { ManualInputs } from '../pages/ReportPage';

interface SyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: AppConfig;
  manualInputs: ManualInputs;
  updateConfig: (c: AppConfig) => void;
  setManual: (m: ManualInputs) => void;
}

export const SyncModal: React.FC<SyncModalProps> = ({ isOpen, onClose, config, manualInputs, updateConfig, setManual }) => {
  const [mode, setMode] = useState<'idle' | 'receive' | 'send'>('idle');
  const [pairCode, setPairCode] = useState('');
  const [inputCode, setInputCode] = useState('');
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');
  
  const peerRef = useRef<Peer | null>(null);

  useEffect(() => {
    return () => {
      if (peerRef.current) {
        peerRef.current.destroy();
      }
    };
  }, []);

  const startReceiving = () => {
    setMode('receive');
    setError('');
    setStatus('正在產生配對碼...');
    
    // Generate 4 digit code
    const code = Math.floor(1000 + Math.random() * 9000).toString();
    setPairCode(code);

    const peer = new Peer(`85cc-sync-${code}`);
    peerRef.current = peer;

    peer.on('open', () => {
      setStatus('等待連線中...');
    });

    peer.on('connection', (conn) => {
      setStatus('設備已連線，接收資料中...');
      conn.on('data', (data: any) => {
        try {
          if (data && data.type === '85cc-sync' && data.payload) {
            if (data.payload.config) updateConfig(data.payload.config);
            if (data.payload.manualInputs) setManual(data.payload.manualInputs);
            setStatus('同步成功！');
            setTimeout(() => {
              onClose();
            }, 2000);
          } else {
            setError('收到無效的資料格式');
          }
        } catch (e) {
          setError('資料解析失敗');
        }
      });
    });

    peer.on('error', (err) => {
      setError(`連線錯誤: ${err.message}`);
      if (err.type === 'unavailable-id') {
         setError('配對碼衝突，請重試');
      }
    });
  };

  const startSending = () => {
    if (!inputCode || inputCode.length !== 4) {
      setError('請輸入 4 位數配對碼');
      return;
    }
    
    setMode('send');
    setError('');
    setStatus('正在連線...');

    const peer = new Peer(); // Random ID for sender
    peerRef.current = peer;

    peer.on('open', () => {
      const conn = peer.connect(`85cc-sync-${inputCode}`);
      
      conn.on('open', () => {
        setStatus('連線成功，正在傳送資料...');
        conn.send({
          type: '85cc-sync',
          payload: {
            config,
            manualInputs
          }
        });
        
        setTimeout(() => {
          setStatus('發送完成！');
          setTimeout(() => {
            onClose();
          }, 1500);
        }, 500);
      });

      conn.on('error', (err) => {
         setError(`傳送失敗: ${err.message}`);
      });
    });

    peer.on('error', (err) => {
      setError(`連線錯誤: ${err.message}`);
    });
  };

  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
      backdropFilter: 'blur(4px)'
    }}>
      <div className="glass-panel" style={{ width: '90%', maxWidth: '400px', position: 'relative', padding: '30px' }}>
        <button onClick={onClose} style={{ position: 'absolute', top: '15px', right: '15px', background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280' }}>
          <X size={20} />
        </button>

        <h2 style={{ marginTop: 0, display: 'flex', alignItems: 'center', gap: '8px', color: '#1f2937' }}>
          <Laptop size={24} /> 跨裝置無痕同步
        </h2>
        
        {mode === 'idle' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', marginTop: '30px' }}>
            <button className="glass-button" onClick={startReceiving} style={{ padding: '20px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px', background: '#eff6ff', borderColor: '#bfdbfe', color: '#1d4ed8' }}>
              <Download size={32} />
              <div style={{ fontSize: '1.2em', fontWeight: 'bold' }}>接收資料</div>
              <div style={{ fontSize: '0.85em', opacity: 0.8 }}>(產生配對碼，讓其他裝置傳入)</div>
            </button>
            <button className="glass-button" onClick={() => setMode('send')} style={{ padding: '20px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px', background: '#f5f3ff', borderColor: '#ddd6fe', color: '#6d28d9' }}>
              <Send size={32} />
              <div style={{ fontSize: '1.2em', fontWeight: 'bold' }}>發送資料</div>
              <div style={{ fontSize: '0.85em', opacity: 0.8 }}>(輸入配對碼，把目前資料傳出)</div>
            </button>
          </div>
        )}

        {mode === 'receive' && (
          <div style={{ textAlign: 'center', marginTop: '20px' }}>
            <p style={{ color: '#4b5563', marginBottom: '10px' }}>請在另一台裝置輸入此配對碼</p>
            <div style={{ fontSize: '3em', letterSpacing: '8px', fontWeight: 'bold', color: '#10b981', background: '#ecfdf5', padding: '20px', borderRadius: '12px', border: '2px dashed #a7f3d0' }}>
              {pairCode}
            </div>
            <p style={{ marginTop: '20px', color: '#6b7280', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
              <span className="pulse-dot" style={{ width: '10px', height: '10px', background: '#3b82f6', borderRadius: '50%', display: 'inline-block' }}></span>
              {status}
            </p>
          </div>
        )}

        {mode === 'send' && (
          <div style={{ textAlign: 'center', marginTop: '20px' }}>
            <p style={{ color: '#4b5563', marginBottom: '10px' }}>請輸入接收端顯示的 4 位數配對碼</p>
            <input 
              type="text" 
              value={inputCode}
              onChange={e => setInputCode(e.target.value.replace(/\D/g, '').slice(0, 4))}
              placeholder="0000"
              style={{ fontSize: '3em', letterSpacing: '8px', textAlign: 'center', width: '100%', padding: '20px', borderRadius: '12px', border: '2px solid #ddd6fe', background: '#f5f3ff', color: '#6d28d9', outline: 'none' }}
            />
            <button className="glass-button" onClick={startSending} disabled={inputCode.length !== 4} style={{ width: '100%', marginTop: '20px', padding: '15px', background: inputCode.length === 4 ? '#8b5cf6' : '#e5e7eb', color: inputCode.length === 4 ? 'white' : '#9ca3af', fontSize: '1.1em' }}>
              開始傳送
            </button>
            <p style={{ marginTop: '15px', color: '#6b7280' }}>{status}</p>
          </div>
        )}

        {error && (
          <div style={{ marginTop: '20px', padding: '10px', background: '#fef2f2', color: '#ef4444', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <AlertCircle size={16} /> {error}
          </div>
        )}
      </div>
      <style>{`
        @keyframes pulse {
          0% { transform: scale(0.95); opacity: 0.5; }
          50% { transform: scale(1.05); opacity: 1; }
          100% { transform: scale(0.95); opacity: 0.5; }
        }
        .pulse-dot {
          animation: pulse 1.5s infinite ease-in-out;
        }
      `}</style>
    </div>
  );
};
