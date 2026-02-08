import fs from 'fs';
import path from 'path';
import { getDataDir, ensureDataDir } from './storage.js';

const BACKUP_DIR = path.join(process.cwd(), 'data', 'backups');
const HOURLY_RETENTION = 24;
const DAILY_RETENTION = 7;

function ensureBackupDir(): void {
  if (!fs.existsSync(BACKUP_DIR)) {
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
  }
}

function getTimestamp(): string {
  return new Date().toISOString().replace(/[:.]/g, '-');
}

// Recursively copy a directory
function copyDirSync(src: string, dest: string): void {
  if (!fs.existsSync(src)) return;
  fs.mkdirSync(dest, { recursive: true });

  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);

    if (entry.name === 'backups') continue; // Don't back up backups

    if (entry.isDirectory()) {
      copyDirSync(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

function performBackup(suffix: string): string | null {
  const dataDir = getDataDir();
  if (!fs.existsSync(dataDir)) return null;

  ensureBackupDir();
  const backupName = `backup-${suffix}-${getTimestamp()}`;
  const backupPath = path.join(BACKUP_DIR, backupName);

  copyDirSync(dataDir, backupPath);

  return backupPath;
}

function cleanOldBackups(prefix: string, maxCount: number): void {
  ensureBackupDir();

  const backups = fs.readdirSync(BACKUP_DIR, { withFileTypes: true })
    .filter(d => d.isDirectory() && d.name.startsWith(`backup-${prefix}-`))
    .map(d => d.name)
    .sort()
    .reverse(); // Newest first

  for (let i = maxCount; i < backups.length; i++) {
    const dirPath = path.join(BACKUP_DIR, backups[i]);
    fs.rmSync(dirPath, { recursive: true, force: true });
  }
}

export function performHourlyBackup(): string | null {
  const backupPath = performBackup('hourly');
  if (backupPath) {
    cleanOldBackups('hourly', HOURLY_RETENTION);
    console.log(`[Backup] Hourly backup created: ${path.basename(backupPath)}`);
  }
  return backupPath;
}

export function performDailyBackup(): string | null {
  const backupPath = performBackup('daily');
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

  hourlyInterval = setInterval(() => {
    try {
      performHourlyBackup();
    } catch (err) {
      console.error('[Backup] Hourly backup failed:', err);
    }
  }, 60 * 60 * 1000);

  dailyInterval = setInterval(() => {
    try {
      performDailyBackup();
    } catch (err) {
      console.error('[Backup] Daily backup failed:', err);
    }
  }, 24 * 60 * 60 * 1000);

  // Initial backup on startup
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
