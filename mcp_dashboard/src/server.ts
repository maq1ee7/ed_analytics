import express, { Request, Response } from 'express';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { getDashboard } from './db.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const publicDir = join(__dirname, '..', 'public');
const dataDir = join(__dirname, '..', 'data');

export function createApp(): express.Express {
  const app = express();

  app.get('/dashboard/:id', (req: Request, res: Response) => {
    res.sendFile(join(publicDir, 'map.html'));
  });

  app.get('/api/dashboard/:id', (req: Request, res: Response) => {
    const dashboard = getDashboard(req.params.id);
    if (!dashboard) {
      res.status(404).json({ error: 'Дашборд не найден' });
      return;
    }
    res.json(dashboard);
  });

  app.use('/data', express.static(dataDir, { index: false }));

  app.use(express.static(publicDir));

  return app;
}
