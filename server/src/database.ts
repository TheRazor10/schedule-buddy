import initSqlJs from 'sql.js';
import type { Database as SqlJsDatabase } from 'sql.js';
import path from 'path';
import fs from 'fs';

const DATA_DIR = path.join(process.cwd(), 'data');

export type Database = SqlJsDatabase;

export function ensureDataDir(): void {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

export function getDbPath(): string {
  return path.join(DATA_DIR, 'schedule-buddy.db');
}

function saveToDisk(db: SqlJsDatabase): void {
  const data = db.export();
  const buffer = Buffer.from(data);
  ensureDataDir();
  fs.writeFileSync(getDbPath(), buffer);
}

export async function initDatabase(): Promise<SqlJsDatabase> {
  ensureDataDir();

  const SQL = await initSqlJs();
  const dbPath = getDbPath();

  let db: SqlJsDatabase;

  // Load existing database or create new one
  if (fs.existsSync(dbPath)) {
    const fileBuffer = fs.readFileSync(dbPath);
    db = new SQL.Database(fileBuffer);
  } else {
    db = new SQL.Database();
  }

  // Enforce foreign keys
  db.run('PRAGMA foreign_keys = ON');

  // Create tables
  db.run(`
    CREATE TABLE IF NOT EXISTS firms (
      id TEXT PRIMARY KEY,
      data TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS config (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);

  // Save initial state to disk
  saveToDisk(db);

  return db;
}

// ============ Firm Operations ============

export interface FirmListItem {
  id: string;
  name: string;
  lastModified: string;
}

export function getAllFirms(db: SqlJsDatabase): FirmListItem[] {
  const stmt = db.prepare('SELECT id, data, updated_at FROM firms ORDER BY updated_at DESC');
  const results: FirmListItem[] = [];

  while (stmt.step()) {
    const row = stmt.getAsObject() as { id: string; data: string; updated_at: string };
    const data = JSON.parse(row.data);
    results.push({
      id: row.id,
      name: data.firmSettings?.firmName || 'Unnamed Firm',
      lastModified: row.updated_at,
    });
  }

  stmt.free();
  return results;
}

export function loadFirm(db: SqlJsDatabase, firmId: string): unknown | null {
  const stmt = db.prepare('SELECT data FROM firms WHERE id = ?');
  stmt.bind([firmId]);

  if (stmt.step()) {
    const row = stmt.getAsObject() as { data: string };
    stmt.free();
    return JSON.parse(row.data);
  }

  stmt.free();
  return null;
}

export function saveFirm(db: SqlJsDatabase, firmData: { id: string; [key: string]: unknown }): boolean {
  const now = new Date().toISOString();
  const dataWithTimestamp = { ...firmData, updatedAt: now };

  // Check if firm exists
  const checkStmt = db.prepare('SELECT id FROM firms WHERE id = ?');
  checkStmt.bind([firmData.id]);
  const exists = checkStmt.step();
  checkStmt.free();

  if (exists) {
    db.run('UPDATE firms SET data = ?, updated_at = ? WHERE id = ?', [
      JSON.stringify(dataWithTimestamp),
      now,
      firmData.id,
    ]);
  } else {
    db.run('INSERT INTO firms (id, data, created_at, updated_at) VALUES (?, ?, ?, ?)', [
      firmData.id,
      JSON.stringify(dataWithTimestamp),
      now,
      now,
    ]);
  }

  saveToDisk(db);
  return true;
}

export function deleteFirm(db: SqlJsDatabase, firmId: string): boolean {
  const countBefore = (db.exec('SELECT COUNT(*) as c FROM firms WHERE id = ?', [firmId])[0]?.values[0]?.[0] as number) || 0;
  if (countBefore === 0) return false;

  db.run('DELETE FROM firms WHERE id = ?', [firmId]);
  saveToDisk(db);
  return true;
}

// ============ Config Operations ============

export interface AppConfig {
  lastFirmId: string | null;
}

export function getConfig(db: SqlJsDatabase): AppConfig {
  const stmt = db.prepare("SELECT value FROM config WHERE key = 'app_config'");

  if (stmt.step()) {
    const row = stmt.getAsObject() as { value: string };
    stmt.free();
    return JSON.parse(row.value);
  }

  stmt.free();
  return { lastFirmId: null };
}

export function setConfig(db: SqlJsDatabase, config: AppConfig): boolean {
  const checkStmt = db.prepare("SELECT key FROM config WHERE key = 'app_config'");
  const exists = checkStmt.step();
  checkStmt.free();

  if (exists) {
    db.run("UPDATE config SET value = ?, updated_at = datetime('now') WHERE key = 'app_config'", [
      JSON.stringify(config),
    ]);
  } else {
    db.run("INSERT INTO config (key, value, updated_at) VALUES ('app_config', ?, datetime('now'))", [
      JSON.stringify(config),
    ]);
  }

  saveToDisk(db);
  return true;
}
