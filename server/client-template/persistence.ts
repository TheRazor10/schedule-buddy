// Generic persistence utility for connecting to the Office Server.
//
// Usage:
//   import { getAll, getOne, save, remove, testServerConnection } from './persistence';
//
// Configure the APP_NAME below, then use the CRUD functions.
// Falls back to localStorage when no server is configured.

// ============ CONFIGURE THIS ============
const APP_NAME = 'my-app'; // Change this to your app's name
// ========================================

const SERVER_CONFIG_KEY = `${APP_NAME}-server-config`;

interface ServerConfig {
  serverUrl: string;
  apiKey: string;
}

// ============ Server Config ============

export function getServerConfig(): ServerConfig | null {
  try {
    const json = localStorage.getItem(SERVER_CONFIG_KEY);
    if (json) {
      const config = JSON.parse(json);
      if (config.serverUrl && config.apiKey) return config;
    }
  } catch (e) {
    console.error('Failed to get server config:', e);
  }
  return null;
}

export function setServerConfig(config: ServerConfig | null): void {
  if (config) {
    localStorage.setItem(SERVER_CONFIG_KEY, JSON.stringify(config));
  } else {
    localStorage.removeItem(SERVER_CONFIG_KEY);
  }
}

export function isServerMode(): boolean {
  return getServerConfig() !== null;
}

export function getStorageMode(): 'server' | 'local' {
  return isServerMode() ? 'server' : 'local';
}

// ============ Server Fetch Helper ============

async function serverFetch(path: string, options: RequestInit = {}): Promise<Response> {
  const config = getServerConfig();
  if (!config) throw new Error('Server not configured');

  const headers: Record<string, string> = {
    'x-api-key': config.apiKey,
    ...((options.headers as Record<string, string>) || {}),
  };

  if (options.body && typeof options.body === 'string') {
    headers['Content-Type'] = 'application/json';
  }

  return fetch(`${config.serverUrl}${path}`, { ...options, headers });
}

// ============ Test Connection ============

export async function testServerConnection(
  serverUrl: string,
  apiKey: string
): Promise<{ ok: boolean; error?: string }> {
  try {
    const response = await fetch(`${serverUrl}/api/health`, {
      headers: { 'x-api-key': apiKey },
    });

    if (!response.ok) {
      return { ok: false, error: `Server responded with status ${response.status}` };
    }

    const data = await response.json();
    return data.status === 'ok'
      ? { ok: true }
      : { ok: false, error: 'Unexpected server response' };
  } catch (e) {
    return { ok: false, error: `Connection failed: ${(e as Error).message}` };
  }
}

// ============ CRUD Operations ============

export async function getAll<T = unknown>(collection: string): Promise<{ id: string; data: T; updatedAt: string }[]> {
  if (isServerMode()) {
    const res = await serverFetch(`/api/${APP_NAME}/${collection}`);
    if (!res.ok) throw new Error(`Server error: ${res.status}`);
    return res.json();
  }

  // localStorage fallback
  const key = `${APP_NAME}-${collection}`;
  const json = localStorage.getItem(key);
  if (!json) return [];
  const items: Record<string, T> = JSON.parse(json);
  return Object.entries(items).map(([id, data]) => ({
    id,
    data,
    updatedAt: new Date().toISOString(),
  }));
}

export async function getOne<T = unknown>(collection: string, id: string): Promise<T | null> {
  if (isServerMode()) {
    const res = await serverFetch(`/api/${APP_NAME}/${collection}/${encodeURIComponent(id)}`);
    if (res.status === 404) return null;
    if (!res.ok) throw new Error(`Server error: ${res.status}`);
    return res.json();
  }

  // localStorage fallback
  const key = `${APP_NAME}-${collection}`;
  const json = localStorage.getItem(key);
  if (!json) return null;
  const items = JSON.parse(json);
  return items[id] ?? null;
}

export async function save<T = unknown>(collection: string, id: string, data: T): Promise<boolean> {
  if (isServerMode()) {
    const res = await serverFetch(`/api/${APP_NAME}/${collection}/${encodeURIComponent(id)}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error(`Server error: ${res.status}`);
    return true;
  }

  // localStorage fallback
  const key = `${APP_NAME}-${collection}`;
  const json = localStorage.getItem(key);
  const items = json ? JSON.parse(json) : {};
  items[id] = data;
  localStorage.setItem(key, JSON.stringify(items));
  return true;
}

export async function remove(collection: string, id: string): Promise<boolean> {
  if (isServerMode()) {
    const res = await serverFetch(`/api/${APP_NAME}/${collection}/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    });
    if (!res.ok && res.status !== 404) throw new Error(`Server error: ${res.status}`);
    return true;
  }

  // localStorage fallback
  const key = `${APP_NAME}-${collection}`;
  const json = localStorage.getItem(key);
  if (!json) return false;
  const items = JSON.parse(json);
  delete items[id];
  localStorage.setItem(key, JSON.stringify(items));
  return true;
}
