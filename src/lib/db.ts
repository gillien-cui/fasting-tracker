import type { SQLiteDatabase } from 'expo-sqlite';
import type { Fast } from './fasts';
import { DEFAULT_SETTINGS, type Settings } from './settings';

export const DATABASE_NAME = 'fasting.db';

const SCHEMA_VERSION = 1;

export async function migrate(db: SQLiteDatabase): Promise<void> {
  const row = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
  const version = row?.user_version ?? 0;
  if (version >= SCHEMA_VERSION) return;
  await db.execAsync(`
    PRAGMA journal_mode = WAL;
    CREATE TABLE IF NOT EXISTS fasts (
      id TEXT PRIMARY KEY NOT NULL,
      started_at TEXT NOT NULL,
      ended_at TEXT,
      goal_minutes INTEGER NOT NULL,
      note TEXT,
      status TEXT NOT NULL CHECK (status IN ('active', 'completed', 'cancelled'))
    );
    CREATE INDEX IF NOT EXISTS fasts_started_at ON fasts (started_at);
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY NOT NULL,
      value TEXT NOT NULL
    );
    PRAGMA user_version = ${SCHEMA_VERSION};
  `);
}

type FastRow = {
  id: string;
  started_at: string;
  ended_at: string | null;
  goal_minutes: number;
  note: string | null;
  status: Fast['status'];
};

const fromRow = (r: FastRow): Fast => ({
  id: r.id,
  startedAt: r.started_at,
  endedAt: r.ended_at,
  goalMinutes: r.goal_minutes,
  note: r.note,
  status: r.status,
});

export async function getAllFasts(db: SQLiteDatabase): Promise<Fast[]> {
  const rows = await db.getAllAsync<FastRow>('SELECT * FROM fasts ORDER BY started_at DESC');
  return rows.map(fromRow);
}

export async function upsertFast(db: SQLiteDatabase, f: Fast): Promise<void> {
  await db.runAsync(
    `INSERT OR REPLACE INTO fasts (id, started_at, ended_at, goal_minutes, note, status)
     VALUES (?, ?, ?, ?, ?, ?)`,
    f.id,
    f.startedAt,
    f.endedAt,
    f.goalMinutes,
    f.note,
    f.status,
  );
}

export async function deleteFast(db: SQLiteDatabase, id: string): Promise<void> {
  await db.runAsync('DELETE FROM fasts WHERE id = ?', id);
}

export async function clearAll(db: SQLiteDatabase): Promise<void> {
  await db.execAsync('DELETE FROM fasts; DELETE FROM settings;');
}

export async function getSettings(db: SQLiteDatabase): Promise<Settings> {
  const rows = await db.getAllAsync<{ key: string; value: string }>('SELECT key, value FROM settings');
  const stored = Object.fromEntries(rows.map((r) => [r.key, JSON.parse(r.value)]));
  return { ...DEFAULT_SETTINGS, ...stored };
}

export async function saveSettings(db: SQLiteDatabase, settings: Partial<Settings>): Promise<void> {
  await db.withTransactionAsync(async () => {
    for (const [key, value] of Object.entries(settings)) {
      await db.runAsync('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)', key, JSON.stringify(value));
    }
  });
}
