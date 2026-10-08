import { randomUUID } from 'expo-crypto';
import { useSQLiteContext } from 'expo-sqlite';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import * as db from './db';
import type { Fast } from './fasts';
import { requestPermission, syncSchedule } from './notifications';
import { DEFAULT_SETTINGS, type Settings } from './settings';

type Store = {
  loaded: boolean;
  /** Every fast except cancelled ones, newest first. */
  fasts: Fast[];
  active: Fast | null;
  settings: Settings;
  startFast: (goalMinutes: number) => Promise<void>;
  endFast: (endedAt?: Date) => Promise<void>;
  cancelFast: () => Promise<void>;
  updateActive: (changes: Partial<Pick<Fast, 'startedAt' | 'goalMinutes'>>) => Promise<void>;
  saveFast: (fast: Fast) => Promise<void>;
  deleteFast: (id: string) => Promise<void>;
  importFasts: (fasts: Fast[]) => Promise<number>;
  updateSettings: (changes: Partial<Settings>) => Promise<void>;
  clearAll: () => Promise<void>;
};

const StoreContext = createContext<Store | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const database = useSQLiteContext();
  const [loaded, setLoaded] = useState(false);
  const [all, setAll] = useState<Fast[]>([]);
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);

  const load = useCallback(() => Promise.all([db.getAllFasts(database), db.getSettings(database)]), [database]);

  const apply = useCallback(([nextFasts, nextSettings]: [Fast[], Settings]) => {
    setAll(nextFasts);
    setSettings(nextSettings);
    setLoaded(true);
    const nextActive = nextFasts.find((f) => f.status === 'active') ?? null;
    syncSchedule(nextActive, nextSettings).catch((err) => console.warn('Could not schedule notifications', err));
  }, []);

  // Every write goes through here: reload from disk, then keep notifications in step.
  const reload = useCallback(async () => apply(await load()), [load, apply]);

  useEffect(() => {
    let live = true;
    load()
      .then((data) => live && apply(data))
      .catch((err) => console.warn('Could not load fasts', err));
    return () => {
      live = false;
    };
  }, [load, apply]);

  const active = all.find((f) => f.status === 'active') ?? null;

  const store = useMemo<Store>(() => {
    const write = async (fn: () => Promise<void>) => {
      await fn();
      await reload();
    };
    return {
      loaded,
      fasts: all.filter((f) => f.status !== 'cancelled'),
      active,
      settings,
      startFast: async (goalMinutes) => {
        if (active) return;
        await write(() =>
          db.upsertFast(database, {
            id: randomUUID(),
            startedAt: new Date().toISOString(),
            endedAt: null,
            goalMinutes,
            note: null,
            status: 'active',
          }),
        );
        if (settings.goalNotification || settings.forgottenReminder) {
          if (await requestPermission()) await reload();
        }
      },
      endFast: async (endedAt = new Date()) => {
        if (!active) return;
        await write(() => db.upsertFast(database, { ...active, endedAt: endedAt.toISOString(), status: 'completed' }));
      },
      cancelFast: async () => {
        if (!active) return;
        await write(() =>
          db.upsertFast(database, { ...active, endedAt: new Date().toISOString(), status: 'cancelled' }),
        );
      },
      updateActive: async (changes) => {
        if (!active) return;
        await write(() => db.upsertFast(database, { ...active, ...changes }));
      },
      saveFast: (fast) => write(() => db.upsertFast(database, fast)),
      deleteFast: (id) => write(() => db.deleteFast(database, id)),
      importFasts: async (incoming) => {
        // Never import a second active fast; everything else is matched by id.
        const rows = incoming.filter((f) => f.status !== 'active');
        await write(() =>
          database.withTransactionAsync(async () => {
            for (const f of rows) await db.upsertFast(database, f);
          }),
        );
        return rows.length;
      },
      updateSettings: (changes) => write(() => db.saveSettings(database, changes)),
      clearAll: () => write(() => db.clearAll(database)),
    };
  }, [loaded, all, active, settings, database, reload]);

  return <StoreContext.Provider value={store}>{children}</StoreContext.Provider>;
}

export function useStore(): Store {
  const store = useContext(StoreContext);
  if (!store) throw new Error('useStore must be used inside StoreProvider');
  return store;
}
