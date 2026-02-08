// Type definitions for Electron API exposed via preload

export interface FirmListItem {
  id: string;
  name: string;
  lastModified: string;
}

export interface SavedFirmData {
  id: string;
  firmSettings: import('./schedule').FirmSettings;
  employees: import('./schedule').Employee[];
  selectedMonth: number;
  selectedYear: number;
  createdAt: string;
  updatedAt: string;
}

export interface AppConfig {
  lastFirmId: string | null;
}

export interface ServerConfig {
  serverUrl: string;  // e.g. "http://192.168.1.50:3456"
  apiKey: string;
}

export interface ElectronFirmsAPI {
  getAll: () => Promise<FirmListItem[]>;
  load: (firmId: string) => Promise<SavedFirmData | null>;
  save: (firmData: SavedFirmData) => Promise<boolean>;
  delete: (firmId: string) => Promise<boolean>;
}

export interface ElectronConfigAPI {
  get: () => Promise<AppConfig>;
  set: (config: AppConfig) => Promise<boolean>;
}

export interface ElectronAPI {
  firms: ElectronFirmsAPI;
  config: ElectronConfigAPI;
  isElectron: () => Promise<boolean>;
}

declare global {
  interface Window {
    electronAPI?: ElectronAPI;
  }
}
