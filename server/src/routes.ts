import { Router, Request, Response } from 'express';
import type { Database } from './database.js';
import * as db from './database.js';

export function createRoutes(database: Database): Router {
  const router = Router();

  // ============ Health Check ============

  router.get('/api/health', (_req: Request, res: Response) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // ============ Firms ============

  // Get all firms (list view)
  router.get('/api/firms', (_req: Request, res: Response) => {
    try {
      const firms = db.getAllFirms(database);
      res.json(firms);
    } catch (err) {
      console.error('Error getting firms:', err);
      res.status(500).json({ error: 'Failed to get firms' });
    }
  });

  // Load a specific firm
  router.get('/api/firms/:id', (req: Request, res: Response) => {
    try {
      const firm = db.loadFirm(database, req.params.id);
      if (!firm) {
        res.status(404).json({ error: 'Firm not found' });
        return;
      }
      res.json(firm);
    } catch (err) {
      console.error('Error loading firm:', err);
      res.status(500).json({ error: 'Failed to load firm' });
    }
  });

  // Save/update a firm
  router.put('/api/firms/:id', (req: Request, res: Response) => {
    try {
      const firmData = req.body;

      // Basic validation
      if (!firmData || !firmData.id) {
        res.status(400).json({ error: 'Invalid firm data: missing id' });
        return;
      }

      if (firmData.id !== req.params.id) {
        res.status(400).json({ error: 'Firm ID in body does not match URL' });
        return;
      }

      if (!firmData.firmSettings) {
        res.status(400).json({ error: 'Invalid firm data: missing firmSettings' });
        return;
      }

      if (!Array.isArray(firmData.employees)) {
        res.status(400).json({ error: 'Invalid firm data: employees must be an array' });
        return;
      }

      db.saveFirm(database, firmData);
      res.json({ success: true });
    } catch (err) {
      console.error('Error saving firm:', err);
      res.status(500).json({ error: 'Failed to save firm' });
    }
  });

  // Create a new firm (POST without ID, or POST with body containing ID)
  router.post('/api/firms', (req: Request, res: Response) => {
    try {
      const firmData = req.body;

      if (!firmData || !firmData.id) {
        res.status(400).json({ error: 'Invalid firm data: missing id' });
        return;
      }

      if (!firmData.firmSettings) {
        res.status(400).json({ error: 'Invalid firm data: missing firmSettings' });
        return;
      }

      db.saveFirm(database, firmData);
      res.status(201).json({ success: true, id: firmData.id });
    } catch (err) {
      console.error('Error creating firm:', err);
      res.status(500).json({ error: 'Failed to create firm' });
    }
  });

  // Delete a firm
  router.delete('/api/firms/:id', (req: Request, res: Response) => {
    try {
      const deleted = db.deleteFirm(database, req.params.id);
      if (!deleted) {
        res.status(404).json({ error: 'Firm not found' });
        return;
      }
      res.json({ success: true });
    } catch (err) {
      console.error('Error deleting firm:', err);
      res.status(500).json({ error: 'Failed to delete firm' });
    }
  });

  // ============ Config ============

  router.get('/api/config', (_req: Request, res: Response) => {
    try {
      const config = db.getConfig(database);
      res.json(config);
    } catch (err) {
      console.error('Error getting config:', err);
      res.status(500).json({ error: 'Failed to get config' });
    }
  });

  router.put('/api/config', (req: Request, res: Response) => {
    try {
      const config = req.body;
      db.setConfig(database, config);
      res.json({ success: true });
    } catch (err) {
      console.error('Error setting config:', err);
      res.status(500).json({ error: 'Failed to set config' });
    }
  });

  return router;
}
