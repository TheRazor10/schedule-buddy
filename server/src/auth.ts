import { Request, Response, NextFunction } from 'express';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

const CONFIG_PATH = path.join(process.cwd(), 'data', 'server-config.json');

interface ServerConfig {
  apiKey: string;
  createdAt: string;
}

function loadServerConfig(): ServerConfig | null {
  try {
    if (fs.existsSync(CONFIG_PATH)) {
      return JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf-8'));
    }
  } catch {
    // Config doesn't exist yet
  }
  return null;
}

function saveServerConfig(config: ServerConfig): void {
  const dir = path.dirname(CONFIG_PATH);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2));
}

export function getOrCreateApiKey(): string {
  const existing = loadServerConfig();
  if (existing?.apiKey) {
    return existing.apiKey;
  }

  // Generate a new API key
  const apiKey = crypto.randomBytes(32).toString('hex');
  saveServerConfig({
    apiKey,
    createdAt: new Date().toISOString(),
  });

  return apiKey;
}

export function apiKeyAuth(apiKey: string) {
  return (req: Request, res: Response, next: NextFunction): void => {
    // Allow health check without auth
    if (req.path === '/api/health') {
      next();
      return;
    }

    const providedKey = req.headers['x-api-key'] as string;

    if (!providedKey || providedKey !== apiKey) {
      res.status(401).json({ error: 'Unauthorized: Invalid or missing API key' });
      return;
    }

    next();
  };
}
