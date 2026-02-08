// Generic ServerSettings component for connecting to the Office Server.
//
// Prerequisites: shadcn/ui components (Button, Input, Label, Badge, Dialog)
//                lucide-react icons
//
// Usage:
//   import ServerSettings from './ServerSettings';
//   <ServerSettings onConnectionChange={() => window.location.reload()} />

import { useState, useEffect } from 'react';
import {
  getServerConfig,
  setServerConfig,
  testServerConnection,
  getStorageMode,
} from './persistence';

interface ServerSettingsProps {
  onConnectionChange?: () => void;
}

export default function ServerSettings({ onConnectionChange }: ServerSettingsProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [serverUrl, setServerUrl] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; error?: string } | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const storageMode = getStorageMode();

  useEffect(() => {
    const config = getServerConfig();
    if (config) {
      setServerUrl(config.serverUrl);
      setApiKey(config.apiKey);
      setIsConnected(true);
    }
  }, [isOpen]);

  const handleTestConnection = async () => {
    if (!serverUrl.trim() || !apiKey.trim()) return;
    setIsTesting(true);
    setTestResult(null);
    const result = await testServerConnection(serverUrl.trim(), apiKey.trim());
    setTestResult(result);
    setIsTesting(false);
  };

  const handleConnect = async () => {
    if (!serverUrl.trim() || !apiKey.trim()) return;
    setIsTesting(true);
    const result = await testServerConnection(serverUrl.trim(), apiKey.trim());
    setIsTesting(false);

    if (!result.ok) {
      setTestResult(result);
      return;
    }

    setServerConfig({ serverUrl: serverUrl.trim(), apiKey: apiKey.trim() });
    setIsConnected(true);
    setTestResult(null);
    setIsOpen(false);
    onConnectionChange?.();
  };

  const handleDisconnect = () => {
    setServerConfig(null);
    setIsConnected(false);
    setServerUrl('');
    setApiKey('');
    setTestResult(null);
    setIsOpen(false);
    onConnectionChange?.();
  };

  // This is a plain HTML/CSS version. Replace with your UI library components
  // (shadcn/ui, MUI, etc.) as needed.

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '6px',
          padding: '4px 8px',
          fontSize: '12px',
          background: 'none',
          border: '1px solid #ddd',
          borderRadius: '4px',
          cursor: 'pointer',
        }}
      >
        {storageMode === 'server' ? 'Server (Connected)' : 'Local Storage'}
      </button>
    );
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
    }}>
      <div style={{
        background: 'white', borderRadius: '8px', padding: '24px',
        width: '100%', maxWidth: '480px', boxShadow: '0 4px 24px rgba(0,0,0,0.2)',
      }}>
        <h2 style={{ margin: '0 0 4px', fontSize: '18px' }}>Server Settings</h2>
        <p style={{ margin: '0 0 16px', color: '#666', fontSize: '14px' }}>
          Connect to the office server for shared data access.
        </p>

        <div style={{ marginBottom: '12px' }}>
          <span style={{ fontSize: '13px', color: '#888' }}>Current mode: </span>
          <strong style={{ fontSize: '13px', color: isConnected ? 'green' : '#333' }}>
            {isConnected ? 'Connected to Server' : 'Local Storage'}
          </strong>
        </div>

        <div style={{ marginBottom: '12px' }}>
          <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', fontWeight: 500 }}>
            Server URL
          </label>
          <input
            type="text"
            placeholder="http://192.168.1.50:3456"
            value={serverUrl}
            onChange={(e) => { setServerUrl(e.target.value); setTestResult(null); }}
            style={{
              width: '100%', padding: '8px', border: '1px solid #ddd',
              borderRadius: '4px', fontSize: '14px', boxSizing: 'border-box',
            }}
          />
        </div>

        <div style={{ marginBottom: '12px' }}>
          <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', fontWeight: 500 }}>
            API Key
          </label>
          <input
            type="password"
            placeholder="Enter the API key from the server"
            value={apiKey}
            onChange={(e) => { setApiKey(e.target.value); setTestResult(null); }}
            style={{
              width: '100%', padding: '8px', border: '1px solid #ddd',
              borderRadius: '4px', fontSize: '14px', boxSizing: 'border-box',
            }}
          />
        </div>

        {testResult && (
          <div style={{
            padding: '10px', borderRadius: '4px', fontSize: '13px', marginBottom: '12px',
            background: testResult.ok ? '#f0fdf4' : '#fef2f2',
            color: testResult.ok ? '#166534' : '#991b1b',
            border: `1px solid ${testResult.ok ? '#bbf7d0' : '#fecaca'}`,
          }}>
            {testResult.ok ? 'Connection successful!' : `Error: ${testResult.error}`}
          </div>
        )}

        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '16px' }}>
          {isConnected && (
            <button onClick={handleDisconnect} style={{
              padding: '8px 16px', background: '#ef4444', color: 'white',
              border: 'none', borderRadius: '4px', cursor: 'pointer', marginRight: 'auto',
            }}>
              Disconnect
            </button>
          )}
          <button onClick={() => setIsOpen(false)} style={{
            padding: '8px 16px', background: '#f3f4f6', border: '1px solid #ddd',
            borderRadius: '4px', cursor: 'pointer',
          }}>
            Cancel
          </button>
          <button
            onClick={handleTestConnection}
            disabled={!serverUrl.trim() || !apiKey.trim() || isTesting}
            style={{
              padding: '8px 16px', background: '#f3f4f6', border: '1px solid #ddd',
              borderRadius: '4px', cursor: 'pointer', opacity: isTesting ? 0.6 : 1,
            }}
          >
            {isTesting ? 'Testing...' : 'Test'}
          </button>
          <button
            onClick={handleConnect}
            disabled={!serverUrl.trim() || !apiKey.trim() || isTesting}
            style={{
              padding: '8px 16px', background: '#2563eb', color: 'white',
              border: 'none', borderRadius: '4px', cursor: 'pointer', opacity: isTesting ? 0.6 : 1,
            }}
          >
            {isTesting ? 'Connecting...' : 'Connect'}
          </button>
        </div>
      </div>
    </div>
  );
}
