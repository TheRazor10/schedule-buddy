import { Router, Request, Response } from 'express';
import * as storage from './storage.js';

// Validate path segments to prevent directory traversal
function isValidSegment(segment: string): boolean {
  if (!segment || segment.length > 100) return false;
  if (segment === '.' || segment === '..') return false;
  if (/[\/\\<>:"|?*\x00-\x1f]/.test(segment)) return false;
  return true;
}

export function createRoutes(): Router {
  const router = Router();

  // Health check (no auth required — handled in auth middleware)
  router.get('/api/health', (_req: Request, res: Response) => {
    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      apps: storage.listApps(),
    });
  });

  // List all apps
  router.get('/api/apps', (_req: Request, res: Response) => {
    res.json(storage.listApps());
  });

  // List all collections for an app
  router.get('/api/:app', (req: Request, res: Response) => {
    const { app } = req.params;
    if (!isValidSegment(app)) {
      res.status(400).json({ error: 'Invalid app name' });
      return;
    }
    res.json(storage.listCollections(app));
  });

  // List all items in a collection
  router.get('/api/:app/:collection', (req: Request, res: Response) => {
    const { app, collection } = req.params;
    if (!isValidSegment(app) || !isValidSegment(collection)) {
      res.status(400).json({ error: 'Invalid app or collection name' });
      return;
    }

    try {
      const items = storage.listItems(app, collection);
      res.json(items);
    } catch (err) {
      console.error('Error listing items:', err);
      res.status(500).json({ error: 'Failed to list items' });
    }
  });

  // Get a single item
  router.get('/api/:app/:collection/:id', (req: Request, res: Response) => {
    const { app, collection, id } = req.params;
    if (!isValidSegment(app) || !isValidSegment(collection) || !isValidSegment(id)) {
      res.status(400).json({ error: 'Invalid path parameter' });
      return;
    }

    try {
      const item = storage.getItem(app, collection, id);
      if (item === null) {
        res.status(404).json({ error: 'Item not found' });
        return;
      }
      res.json(item);
    } catch (err) {
      console.error('Error getting item:', err);
      res.status(500).json({ error: 'Failed to get item' });
    }
  });

  // Create an item (POST — server can generate ID or use one from body)
  router.post('/api/:app/:collection', (req: Request, res: Response) => {
    const { app, collection } = req.params;
    if (!isValidSegment(app) || !isValidSegment(collection)) {
      res.status(400).json({ error: 'Invalid app or collection name' });
      return;
    }

    try {
      const data = req.body;
      const id = data?.id || `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

      if (!isValidSegment(id)) {
        res.status(400).json({ error: 'Invalid item ID' });
        return;
      }

      storage.saveItem(app, collection, id, data);
      res.status(201).json({ success: true, id });
    } catch (err) {
      console.error('Error creating item:', err);
      res.status(500).json({ error: 'Failed to create item' });
    }
  });

  // Update/create an item with specific ID
  router.put('/api/:app/:collection/:id', (req: Request, res: Response) => {
    const { app, collection, id } = req.params;
    if (!isValidSegment(app) || !isValidSegment(collection) || !isValidSegment(id)) {
      res.status(400).json({ error: 'Invalid path parameter' });
      return;
    }

    try {
      storage.saveItem(app, collection, id, req.body);
      res.json({ success: true });
    } catch (err) {
      console.error('Error saving item:', err);
      res.status(500).json({ error: 'Failed to save item' });
    }
  });

  // Delete an item
  router.delete('/api/:app/:collection/:id', (req: Request, res: Response) => {
    const { app, collection, id } = req.params;
    if (!isValidSegment(app) || !isValidSegment(collection) || !isValidSegment(id)) {
      res.status(400).json({ error: 'Invalid path parameter' });
      return;
    }

    try {
      const deleted = storage.deleteItem(app, collection, id);
      if (!deleted) {
        res.status(404).json({ error: 'Item not found' });
        return;
      }
      res.json({ success: true });
    } catch (err) {
      console.error('Error deleting item:', err);
      res.status(500).json({ error: 'Failed to delete item' });
    }
  });

  return router;
}
