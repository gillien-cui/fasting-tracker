import type { Fast } from './fasts';
import { DEFAULT_SETTINGS, type Settings } from './settings';

/** Where fasts and settings are kept. SQLite on the phone; an in-memory copy in tests. */
export type FastRepository = {
  getAll(): Promise<Fast[]>;
  upsert(fasts: Fast[]): Promise<void>;
  delete(id: string): Promise<void>;
  clearAll(): Promise<void>;
  getSettings(): Promise<Settings>;
  saveSettings(changes: Partial<Settings>): Promise<void>;
};

export function createMemoryRepository(initial: Fast[] = []): FastRepository {
  const fasts = new Map(initial.map((f) => [f.id, { ...f }]));
  let settings: Partial<Settings> = {};
  return {
    getAll: async () =>
      [...fasts.values()].sort((a, b) => b.startedAt.localeCompare(a.startedAt)).map((f) => ({ ...f })),
    upsert: async (list) => list.forEach((f) => fasts.set(f.id, { ...f })),
    delete: async (id) => void fasts.delete(id),
    clearAll: async () => {
      fasts.clear();
      settings = {};
    },
    getSettings: async () => ({ ...DEFAULT_SETTINGS, ...settings }),
    saveSettings: async (changes) => void (settings = { ...settings, ...changes }),
  };
}
