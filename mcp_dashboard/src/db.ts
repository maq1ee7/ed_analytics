import Database from 'better-sqlite3';
import { existsSync, mkdirSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import type { RussiaMapChartData, StoredDashboard } from './types.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

const defaultDbPath = join(__dirname, '..', 'data', 'dashboards.db');

function getDbPath(): string {
  const envPath = process.env.DATABASE_PATH;
  return envPath ?? defaultDbPath;
}

function ensureDataDir(dbPath: string): void {
  const dir = dirname(dbPath);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
}

let db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (!db) {
    const path = getDbPath();
    ensureDataDir(path);
    db = new Database(path);
    db.exec(`
      CREATE TABLE IF NOT EXISTS dashboards (
        id TEXT PRIMARY KEY,
        type TEXT NOT NULL,
        payload TEXT NOT NULL,
        created_at TEXT NOT NULL
      );
    `);
  }
  return db;
}

export function saveDashboard(
  id: string,
  type: 'russia_map',
  payload: RussiaMapChartData
): void {
  const database = getDb();
  const stmt = database.prepare(
    `INSERT INTO dashboards (id, type, payload, created_at) VALUES (?, ?, ?, ?)`
  );
  stmt.run(id, type, JSON.stringify(payload), new Date().toISOString());
}

export function getDashboard(id: string): StoredDashboard | null {
  const database = getDb();
  const row = database
    .prepare(
      `SELECT id, type, payload, created_at as createdAt FROM dashboards WHERE id = ?`
    )
    .get(id) as { id: string; type: string; payload: string; createdAt: string } | undefined;
  if (!row) return null;
  return {
    id: row.id,
    type: row.type as StoredDashboard['type'],
    payload: JSON.parse(row.payload) as RussiaMapChartData,
    createdAt: row.createdAt,
  };
}
