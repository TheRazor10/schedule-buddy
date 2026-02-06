import express from 'express';
import cors from 'cors';
import https from 'https';
import http from 'http';
import fs from 'fs';
import { initDatabase } from './database.js';
import { createRoutes } from './routes.js';
import { apiKeyAuth, getOrCreateApiKey } from './auth.js';
import { requestLogger } from './logger.js';
import { startBackupSchedule, stopBackupSchedule } from './backup.js';
import { getOrCreateCerts } from './certs.js';

const HTTP_PORT = parseInt(process.env.PORT || '3456', 10);
const HTTPS_PORT = parseInt(process.env.HTTPS_PORT || '3457', 10);
const USE_HTTPS = process.env.DISABLE_HTTPS !== 'true';

async function main(): Promise<void> {
  // Initialize database
  const db = await initDatabase();
  console.log('[DB] Database initialized');

  // Get or create API key
  const apiKey = getOrCreateApiKey();

  // Create Express app
  const app = express();

  // Middleware
  app.use(cors());
  app.use(express.json({ limit: '10mb' }));
  app.use(requestLogger);
  app.use(apiKeyAuth(apiKey));

  // Routes
  app.use(createRoutes(db));

  // Start HTTP server
  const httpServer = http.createServer(app);
  httpServer.listen(HTTP_PORT, '0.0.0.0', () => {
    console.log(`[Server] HTTP server listening on http://0.0.0.0:${HTTP_PORT}`);
  });

  // Start HTTPS server
  if (USE_HTTPS) {
    try {
      const certPaths = getOrCreateCerts();
      const httpsOptions = {
        cert: fs.readFileSync(certPaths.cert),
        key: fs.readFileSync(certPaths.key),
      };

      const httpsServer = https.createServer(httpsOptions, app);
      httpsServer.listen(HTTPS_PORT, '0.0.0.0', () => {
        console.log(`[Server] HTTPS server listening on https://0.0.0.0:${HTTPS_PORT}`);
      });
    } catch (err) {
      console.error('[Server] Failed to start HTTPS server:', err);
      console.log('[Server] Continuing with HTTP only');
    }
  }

  // Start backup schedule
  startBackupSchedule();

  // Print connection info
  console.log('\n========================================');
  console.log('  Schedule Buddy Server is running!');
  console.log('========================================');
  console.log(`  HTTP:    http://0.0.0.0:${HTTP_PORT}`);
  if (USE_HTTPS) {
    console.log(`  HTTPS:   https://0.0.0.0:${HTTPS_PORT}`);
  }
  console.log(`  API Key: ${apiKey}`);
  console.log('');
  console.log('  Enter this API key in the Electron app');
  console.log('  settings to connect to this server.');
  console.log('========================================\n');

  // Graceful shutdown
  function shutdown(): void {
    console.log('\n[Server] Shutting down...');
    stopBackupSchedule();
    db.close();
    httpServer.close();
    process.exit(0);
  }

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

main();
