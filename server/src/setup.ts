// First-time setup helper
// Run with: npm run setup

import { ensureDataDir } from './storage.js';
import { getOrCreateApiKey } from './auth.js';
import { getOrCreateCerts } from './certs.js';

function setup(): void {
  console.log('Office Server - Setup\n');

  // 1. Create data directory
  ensureDataDir();
  console.log('[OK] Data directory created');

  // 2. Generate API key
  const apiKey = getOrCreateApiKey();
  console.log('[OK] API key generated');

  // 3. Generate self-signed certificate
  getOrCreateCerts();
  console.log('[OK] Self-signed certificate generated');

  console.log('\n========================================');
  console.log('  Setup complete!');
  console.log('========================================');
  console.log(`  API Key: ${apiKey}`);
  console.log('');
  console.log('  Save this API key - you will need it');
  console.log('  to configure your apps.');
  console.log('');
  console.log('  Start the server with: npm run dev');
  console.log('========================================\n');
}

setup();
