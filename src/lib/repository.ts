import type { Fast } from './fasts';
import { DEFAULT_SETTINGS, type Settings } from './settings';
import type { WeightEntry } from './weights';

/** Where fasts, weights and settings are kept. SQLite on the phone; an in-memory copy in tests. */
export type FastRepository = {
  getAll(): Promise<Fast[]>;
  upsert(fasts: Fast[]): Promise<void>;
  delete(id: string): Promise<void>;
  clearAll(): Promise<void>;
  getSettings(): Promise<Settings>;
  saveSettings(changes: Partial<Settings>): Promise<void>;
  getWeights(): Promise<WeightEntry[]>;
  upsertWeights(weights: WeightEntry[]): Promise<void>;
  deleteWeight(day: string): Promise<void>;
};

export function createMemoryRepository(initial: Fast[] = []): FastRepository {
  const fasts = new Map(initial.map((f) => [f.id, { ...f }]));
  const weights = new Map<string, WeightEntry>();
  let settings: Partial<Settings> = {};
  return {
    getAll: async () =>
      [...fasts.values()].sort((a, b) => b.startedAt.localeCompare(a.startedAt)).map((f) => ({ ...f })),
    upsert: async (list) => list.forEach((f) => fasts.set(f.id, { ...f })),
    delete: async (id) => void fasts.delete(id),
    clearAll: async () => {
      fasts.clear();
      weights.clear();
      settings = {};
    },
    getSettings: async () => ({ ...DEFAULT_SETTINGS, ...settings }),
    saveSettings: async (changes) => void (settings = { ...settings, ...changes }),
    getWeights: async () => [...weights.values()].sort((a, b) => b.day.localeCompare(a.day)).map((w) => ({ ...w })),
    upsertWeights: async (list) => list.forEach((w) => weights.set(w.day, { ...w })),
    deleteWeight: async (day) => void weights.delete(day),
  };
}
