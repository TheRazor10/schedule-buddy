import { Request, Response, NextFunction } from 'express';

export function requestLogger(req: Request, res: Response, next: NextFunction): void {
  const start = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - start;
    const timestamp = new Date().toISOString();
    const clientIp = req.ip || req.socket.remoteAddress || 'unknown';

    console.log(
      `[${timestamp}] ${req.method} ${req.path} → ${res.statusCode} (${duration}ms) from ${clientIp}`
    );
  });

  next();
}
