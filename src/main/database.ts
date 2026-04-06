import path from 'node:path';
import Database from 'better-sqlite3';
import { app } from 'electron';
import log from 'electron-log';

let db: Database.Database;

export interface SnapRecord {
  id: string;
  filePath: string;
  thumbPath: string;
  sourceApp: string | null;
  width: number;
  height: number;
  posX: number | null;
  posY: number | null;
  opacity: number;
  hasShadow: number;
  isOpen: number;
  createdAt: string;
}

export function initDatabase(): void {
  const dbPath = path.join(app.getPath('userData'), 'snappy.db');
  db = new Database(dbPath);

  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

  db.exec(`
    CREATE TABLE IF NOT EXISTS snaps (
      id         TEXT PRIMARY KEY,
      filePath   TEXT NOT NULL,
      thumbPath  TEXT NOT NULL,
      sourceApp  TEXT,
      width      INTEGER NOT NULL,
      height     INTEGER NOT NULL,
      posX       INTEGER,
      posY       INTEGER,
      opacity    REAL DEFAULT 1.0,
      hasShadow  INTEGER DEFAULT 1,
      isOpen     INTEGER DEFAULT 1,
      createdAt  TEXT NOT NULL
    )
  `);

  log.info(`Database initialized at ${dbPath}`);
}

export function insertSnap(snap: SnapRecord): void {
  const stmt = db.prepare(`
    INSERT INTO snaps (id, filePath, thumbPath, sourceApp, width, height, posX, posY, opacity, hasShadow, isOpen, createdAt)
    VALUES (@id, @filePath, @thumbPath, @sourceApp, @width, @height, @posX, @posY, @opacity, @hasShadow, @isOpen, @createdAt)
  `);
  stmt.run(snap);
}

export function updateSnap(
  id: string,
  fields: Partial<
    Pick<SnapRecord, 'posX' | 'posY' | 'opacity' | 'hasShadow' | 'isOpen'>
  >,
): void {
  const sets: string[] = [];
  const values: Record<string, unknown> = { id };

  for (const [key, value] of Object.entries(fields)) {
    if (value !== undefined) {
      sets.push(`${key} = @${key}`);
      values[key] = value;
    }
  }

  if (sets.length === 0) return;

  const stmt = db.prepare(`UPDATE snaps SET ${sets.join(', ')} WHERE id = @id`);
  stmt.run(values);
}

export function getSnap(id: string): SnapRecord | undefined {
  const stmt = db.prepare('SELECT * FROM snaps WHERE id = ?');
  return stmt.get(id) as SnapRecord | undefined;
}

export function getAllSnaps(): SnapRecord[] {
  const stmt = db.prepare('SELECT * FROM snaps ORDER BY createdAt DESC');
  return stmt.all() as SnapRecord[];
}

export function deleteSnap(id: string): void {
  const stmt = db.prepare('DELETE FROM snaps WHERE id = ?');
  stmt.run(id);
}

export function closeDatabase(): void {
  if (db) {
    db.close();
    log.info('Database closed');
  }
}
