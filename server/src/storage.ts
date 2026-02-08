import fs from 'fs';
import path from 'path';

const DATA_DIR = path.join(process.cwd(), 'data');

export function ensureDataDir(): void {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

export function getDataDir(): string {
  return DATA_DIR;
}

function getCollectionDir(app: string, collection: string): string {
  return path.join(DATA_DIR, app, collection);
}

function ensureCollectionDir(app: string, collection: string): string {
  const dir = getCollectionDir(app, collection);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  return dir;
}

function getItemPath(app: string, collection: string, id: string): string {
  return path.join(getCollectionDir(app, collection), `${id}.json`);
}

// List all items in a collection
export function listItems(app: string, collection: string): { id: string; data: unknown; updatedAt: string }[] {
  const dir = getCollectionDir(app, collection);
  if (!fs.existsSync(dir)) return [];

  const files = fs.readdirSync(dir).filter(f => f.endsWith('.json'));
  return files.map(file => {
    const filePath = path.join(dir, file);
    const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    const stat = fs.statSync(filePath);
    return {
      id: path.basename(file, '.json'),
      data,
      updatedAt: stat.mtime.toISOString(),
    };
  }).sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
}

// Get a single item
export function getItem(app: string, collection: string, id: string): unknown | null {
  const filePath = getItemPath(app, collection, id);
  if (!fs.existsSync(filePath)) return null;
  return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
}

// Save an item (create or update)
export function saveItem(app: string, collection: string, id: string, data: unknown): boolean {
  ensureCollectionDir(app, collection);
  const filePath = getItemPath(app, collection, id);
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
  return true;
}

// Delete an item
export function deleteItem(app: string, collection: string, id: string): boolean {
  const filePath = getItemPath(app, collection, id);
  if (!fs.existsSync(filePath)) return false;
  fs.unlinkSync(filePath);
  return true;
}

// List all apps (top-level folders in data/)
export function listApps(): string[] {
  ensureDataDir();
  return fs.readdirSync(DATA_DIR, { withFileTypes: true })
    .filter(d => d.isDirectory() && d.name !== 'backups')
    .map(d => d.name);
}

// List all collections for an app
export function listCollections(app: string): string[] {
  const appDir = path.join(DATA_DIR, app);
  if (!fs.existsSync(appDir)) return [];
  return fs.readdirSync(appDir, { withFileTypes: true })
    .filter(d => d.isDirectory())
    .map(d => d.name);
}
