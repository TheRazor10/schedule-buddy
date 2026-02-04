// Persistence layer that works with both localStorage (web) and Electron filesystem

import type { FirmSettings, Employee } from '@/types/schedule';
import type { FirmListItem, SavedFirmData, AppConfig } from '@/types/electron';

const STORAGE_KEY_PREFIX = 'schedule-buddy-firm-';
const FIRMS_LIST_KEY = 'schedule-buddy-firms-list';
const CONFIG_KEY = 'schedule-buddy-config';

// Check if running in Electron
export function isElectron(): boolean {
  return typeof window !== 'undefined' && !!window.electronAPI;
}

// Generate a unique ID for new firms
export function generateFirmId(): string {
  return `firm-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

// Create a new firm data object
export function createNewFirm(id?: string): SavedFirmData {
  const now = new Date().toISOString();
  return {
    id: id || generateFirmId(),
    firmSettings: {
      firmName: '',
      ownerName: '',
      operatingHoursStart: '08:00',
      operatingHoursEnd: '20:00',
      worksOnHolidays: false,
      positions: [],
      shifts: [],
    },
    employees: [],
    selectedMonth: new Date().getMonth() + 1,
    selectedYear: 2026,
    createdAt: now,
    updatedAt: now,
  };
}

// ============ Electron Persistence ============

async function electronGetAllFirms(): Promise<FirmListItem[]> {
  if (!window.electronAPI) return [];
  return window.electronAPI.firms.getAll();
}

async function electronLoadFirm(firmId: string): Promise<SavedFirmData | null> {
  if (!window.electronAPI) return null;
  return window.electronAPI.firms.load(firmId);
}

async function electronSaveFirm(firmData: SavedFirmData): Promise<boolean> {
  if (!window.electronAPI) return false;
  return window.electronAPI.firms.save({
    ...firmData,
    updatedAt: new Date().toISOString(),
  });
}

async function electronDeleteFirm(firmId: string): Promise<boolean> {
  if (!window.electronAPI) return false;
  return window.electronAPI.firms.delete(firmId);
}

async function electronGetConfig(): Promise<AppConfig> {
  if (!window.electronAPI) return { lastFirmId: null };
  return window.electronAPI.config.get();
}

async function electronSetConfig(config: AppConfig): Promise<boolean> {
  if (!window.electronAPI) return false;
  return window.electronAPI.config.set(config);
}

// ============ localStorage Persistence ============

function localGetAllFirms(): FirmListItem[] {
  try {
    const listJson = localStorage.getItem(FIRMS_LIST_KEY);
    if (listJson) {
      return JSON.parse(listJson);
    }
  } catch (e) {
    console.error('Failed to get firms list from localStorage:', e);
  }
  return [];
}

function localUpdateFirmsList(firms: FirmListItem[]): void {
  try {
    localStorage.setItem(FIRMS_LIST_KEY, JSON.stringify(firms));
  } catch (e) {
    console.error('Failed to update firms list in localStorage:', e);
  }
}

function localLoadFirm(firmId: string): SavedFirmData | null {
  try {
    const dataJson = localStorage.getItem(STORAGE_KEY_PREFIX + firmId);
    if (dataJson) {
      return JSON.parse(dataJson);
    }
  } catch (e) {
    console.error('Failed to load firm from localStorage:', e);
  }
  return null;
}

function localSaveFirm(firmData: SavedFirmData): boolean {
  try {
    const updatedData = {
      ...firmData,
      updatedAt: new Date().toISOString(),
    };
    localStorage.setItem(STORAGE_KEY_PREFIX + firmData.id, JSON.stringify(updatedData));

    // Update the firms list
    const firms = localGetAllFirms();
    const existingIndex = firms.findIndex(f => f.id === firmData.id);
    const listItem: FirmListItem = {
      id: firmData.id,
      name: firmData.firmSettings.firmName || 'Unnamed Firm',
      lastModified: updatedData.updatedAt,
    };

    if (existingIndex >= 0) {
      firms[existingIndex] = listItem;
    } else {
      firms.unshift(listItem);
    }

    localUpdateFirmsList(firms);
    return true;
  } catch (e) {
    console.error('Failed to save firm to localStorage:', e);
    return false;
  }
}

function localDeleteFirm(firmId: string): boolean {
  try {
    localStorage.removeItem(STORAGE_KEY_PREFIX + firmId);
    const firms = localGetAllFirms().filter(f => f.id !== firmId);
    localUpdateFirmsList(firms);
    return true;
  } catch (e) {
    console.error('Failed to delete firm from localStorage:', e);
    return false;
  }
}

function localGetConfig(): AppConfig {
  try {
    const configJson = localStorage.getItem(CONFIG_KEY);
    if (configJson) {
      return JSON.parse(configJson);
    }
  } catch (e) {
    console.error('Failed to get config from localStorage:', e);
  }
  return { lastFirmId: null };
}

function localSetConfig(config: AppConfig): boolean {
  try {
    localStorage.setItem(CONFIG_KEY, JSON.stringify(config));
    return true;
  } catch (e) {
    console.error('Failed to set config in localStorage:', e);
    return false;
  }
}

// ============ Unified API ============

export async function getAllFirms(): Promise<FirmListItem[]> {
  if (isElectron()) {
    return electronGetAllFirms();
  }
  return localGetAllFirms();
}

export async function loadFirm(firmId: string): Promise<SavedFirmData | null> {
  if (isElectron()) {
    return electronLoadFirm(firmId);
  }
  return localLoadFirm(firmId);
}

export async function saveFirm(firmData: SavedFirmData): Promise<boolean> {
  if (isElectron()) {
    return electronSaveFirm(firmData);
  }
  return localSaveFirm(firmData);
}

export async function deleteFirm(firmId: string): Promise<boolean> {
  if (isElectron()) {
    return electronDeleteFirm(firmId);
  }
  return localDeleteFirm(firmId);
}

export async function getConfig(): Promise<AppConfig> {
  if (isElectron()) {
    return electronGetConfig();
  }
  return localGetConfig();
}

export async function setConfig(config: AppConfig): Promise<boolean> {
  if (isElectron()) {
    return electronSetConfig(config);
  }
  return localSetConfig(config);
}

// Migration: Convert old single-firm localStorage to new multi-firm format
export async function migrateOldStorage(): Promise<string | null> {
  const OLD_STORAGE_KEY = 'schedule-generator-data';

  try {
    const oldDataJson = localStorage.getItem(OLD_STORAGE_KEY);
    if (!oldDataJson) return null;

    const oldData = JSON.parse(oldDataJson);

    // Check if already migrated (no firmSettings in old format means already migrated)
    if (!oldData.firmSettings) return null;

    // Create new firm from old data
    const newFirm = createNewFirm();
    newFirm.firmSettings = oldData.firmSettings;
    newFirm.employees = oldData.employees || [];
    newFirm.selectedMonth = oldData.selectedMonth || new Date().getMonth() + 1;
    newFirm.selectedYear = oldData.selectedYear || 2026;

    // Save the new firm
    await saveFirm(newFirm);

    // Set as last used firm
    await setConfig({ lastFirmId: newFirm.id });

    // Remove old storage
    localStorage.removeItem(OLD_STORAGE_KEY);

    console.log('Successfully migrated old data to new multi-firm format');
    return newFirm.id;
  } catch (e) {
    console.error('Failed to migrate old storage:', e);
    return null;
  }
}

// Export firm to JSON file (for backup/sharing)
export function exportFirmToJson(firmData: SavedFirmData): void {
  const blob = new Blob([JSON.stringify(firmData, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${firmData.firmSettings.firmName || 'firm'}-backup.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// Import firm from JSON file
export function importFirmFromJson(file: File): Promise<SavedFirmData> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target?.result as string);
        // Validate basic structure
        if (!data.firmSettings || !Array.isArray(data.employees)) {
          throw new Error('Invalid firm data structure');
        }
        // Generate new ID and timestamps for imported firm
        const importedFirm: SavedFirmData = {
          ...data,
          id: generateFirmId(),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        resolve(importedFirm);
      } catch (err) {
        reject(new Error('Failed to parse firm data'));
      }
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsText(file);
  });
}
