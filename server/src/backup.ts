import fs from 'fs';
import path from 'path';
import { getDbPath, ensureDataDir } from './database.js';

const BACKUP_DIR = path.join(process.cwd(), 'data', 'backups');
const HOURLY_RETENTION = 24;  // Keep last 24 hourly backups
const DAILY_RETENTION = 7;    // Keep last 7 daily backups

function ensureBackupDir(): void {
  if (!fs.existsSync(BACKUP_DIR)) {
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
  }
}

function getTimestamp(): string {
  return new Date().toISOString().replace(/[:.]/g, '-');
}

function copyDatabase(suffix: string): string | null {
  const dbPath = getDbPath();
  if (!fs.existsSync(dbPath)) return null;

  ensureBackupDir();
  const backupName = `schedule-buddy-${suffix}-${getTimestamp()}.db`;
  const backupPath = path.join(BACKUP_DIR, backupName);

  fs.copyFileSync(dbPath, backupPath);

  // Also copy the WAL file if it exists (ensures backup consistency)
  const walPath = dbPath + '-wal';
  if (fs.existsSync(walPath)) {
    fs.copyFileSync(walPath, backupPath + '-wal');
  }

  return backupPath;
}

function cleanOldBackups(prefix: string, maxCount: number): void {
  ensureBackupDir();

  const backups = fs.readdirSync(BACKUP_DIR)
    .filter(f => f.startsWith(`schedule-buddy-${prefix}-`) && f.endsWith('.db'))
    .sort()
    .reverse(); // Newest first

  // Delete backups beyond retention count
  for (let i = maxCount; i < backups.length; i++) {
    const filePath = path.join(BACKUP_DIR, backups[i]);
    fs.unlinkSync(filePath);

    // Also delete WAL file if exists
    const walPath = filePath + '-wal';
    if (fs.existsSync(walPath)) {
      fs.unlinkSync(walPath);
    }
  }
}

export function performHourlyBackup(): string | null {
  const backupPath = copyDatabase('hourly');
  if (backupPath) {
    cleanOldBackups('hourly', HOURLY_RETENTION);
    console.log(`[Backup] Hourly backup created: ${path.basename(backupPath)}`);
  }
  return backupPath;
}

export function performDailyBackup(): string | null {
  const backupPath = copyDatabase('daily');
  if (backupPath) {
    cleanOldBackups('daily', DAILY_RETENTION);
    console.log(`[Backup] Daily backup created: ${path.basename(backupPath)}`);
  }
  return backupPath;
}

let hourlyInterval: ReturnType<typeof setInterval> | null = null;
let dailyInterval: ReturnType<typeof setInterval> | null = null;

export function startBackupSchedule(): void {
  ensureDataDir();

  // Hourly backup
  hourlyInterval = setInterval(() => {
    try {
      performHourlyBackup();
    } catch (err) {
      console.error('[Backup] Hourly backup failed:', err);
    }
  }, 60 * 60 * 1000); // 1 hour

  // Daily backup
  dailyInterval = setInterval(() => {
    try {
      performDailyBackup();
    } catch (err) {
      console.error('[Backup] Daily backup failed:', err);
    }
  }, 24 * 60 * 60 * 1000); // 24 hours

  // Also perform an initial backup on startup
  try {
    performHourlyBackup();
  } catch (err) {
    console.error('[Backup] Initial backup failed:', err);
  }

  console.log('[Backup] Backup schedule started (hourly + daily)');
}

export function stopBackupSchedule(): void {
  if (hourlyInterval) clearInterval(hourlyInterval);
  if (dailyInterval) clearInterval(dailyInterval);
  console.log('[Backup] Backup schedule stopped');
}
