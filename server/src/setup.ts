// First-time setup helper
// Run with: npm run setup

import { initDatabase, ensureDataDir } from './database.js';
import { getOrCreateApiKey } from './auth.js';
import { getOrCreateCerts } from './certs.js';

async function setup(): Promise<void> {
  console.log('Schedule Buddy Server - Setup\n');

  // 1. Create data directory
  ensureDataDir();
  console.log('[OK] Data directory created');

  // 2. Initialize database
  const db = await initDatabase();
  db.close();
  console.log('[OK] Database initialized');

  // 3. Generate API key
  const apiKey = getOrCreateApiKey();
  console.log('[OK] API key generated');

  // 4. Generate self-signed certificate
  getOrCreateCerts();
  console.log('[OK] Self-signed certificate generated');

  console.log('\n========================================');
  console.log('  Setup complete!');
  console.log('========================================');
  console.log(`  API Key: ${apiKey}`);
  console.log('');
  console.log('  Save this API key - you will need it');
  console.log('  to configure the Electron app.');
  console.log('');
  console.log('  Start the server with: npm run dev');
  console.log('========================================\n');
}

setup();
