import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

const DATA_DIR = path.join(process.cwd(), 'data');

export function ensureDataDir(): void {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

export function getDbPath(): string {
  return path.join(DATA_DIR, 'schedule-buddy.db');
}

export function initDatabase(): Database.Database {
  ensureDataDir();

  const db = new Database(getDbPath());

  // Enable WAL mode for better concurrent read performance
  db.pragma('journal_mode = WAL');
  // Enforce foreign keys
  db.pragma('foreign_keys = ON');

  // Create tables
  db.exec(`
    CREATE TABLE IF NOT EXISTS firms (
      id TEXT PRIMARY KEY,
      data TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS config (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);

  return db;
}

// ============ Firm Operations ============

export interface FirmListItem {
  id: string;
  name: string;
  lastModified: string;
}

export function getAllFirms(db: Database.Database): FirmListItem[] {
  const rows = db.prepare(`
    SELECT id, data, updated_at FROM firms ORDER BY updated_at DESC
  `).all() as { id: string; data: string; updated_at: string }[];

  return rows.map(row => {
    const data = JSON.parse(row.data);
    return {
      id: row.id,
      name: data.firmSettings?.firmName || 'Unnamed Firm',
      lastModified: row.updated_at,
    };
  });
}

export function loadFirm(db: Database.Database, firmId: string): unknown | null {
  const row = db.prepare('SELECT data FROM firms WHERE id = ?').get(firmId) as { data: string } | undefined;
  if (!row) return null;
  return JSON.parse(row.data);
}

export function saveFirm(db: Database.Database, firmData: { id: string; [key: string]: unknown }): boolean {
  const now = new Date().toISOString();
  const dataWithTimestamp = { ...firmData, updatedAt: now };

  db.prepare(`
    INSERT INTO firms (id, data, created_at, updated_at)
    VALUES (?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      data = excluded.data,
      updated_at = excluded.updated_at
  `).run(firmData.id, JSON.stringify(dataWithTimestamp), now, now);

  return true;
}

export function deleteFirm(db: Database.Database, firmId: string): boolean {
  const result = db.prepare('DELETE FROM firms WHERE id = ?').run(firmId);
  return result.changes > 0;
}

// ============ Config Operations ============

export interface AppConfig {
  lastFirmId: string | null;
}

export function getConfig(db: Database.Database): AppConfig {
  const row = db.prepare("SELECT value FROM config WHERE key = 'app_config'").get() as { value: string } | undefined;
  if (!row) return { lastFirmId: null };
  return JSON.parse(row.value);
}

export function setConfig(db: Database.Database, config: AppConfig): boolean {
  db.prepare(`
    INSERT INTO config (key, value, updated_at)
    VALUES ('app_config', ?, datetime('now'))
    ON CONFLICT(key) DO UPDATE SET
      value = excluded.value,
      updated_at = excluded.updated_at
  `).run(JSON.stringify(config));

  return true;
}
