import { randomUUID } from 'expo-crypto';
import { useSQLiteContext } from 'expo-sqlite';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import * as actions from './actions';
import { notify } from './confirm';
import { createSqliteRepository } from './db';
import type { Fast } from './fasts';
import { requestPermission, syncSchedule } from './notifications';
import { DEFAULT_SETTINGS, type Settings } from './settings';
import { PaletteContext } from './theme';

type Store = {
  loaded: boolean;
  /** Every fast except cancelled ones, newest first. */
  fasts: Fast[];
  active: Fast | null;
  settings: Settings;
  /** The fast that just ended, until its celebration is dismissed. */
  justEnded: Fast | null;
  dismissJustEnded: () => void;
  // Each write resolves true when it was saved. Refusals are shown to the person and resolve false.
  startFast: (goalMinutes?: number, startedAt?: Date) => Promise<boolean>;
  endFast: (endedAt?: Date) => Promise<boolean>;
  cancelFast: () => Promise<boolean>;
  updateActive: (changes: { startedAt?: Date; goalMinutes?: number }) => Promise<boolean>;
  savePastFast: (input: actions.PastFastInput) => Promise<boolean>;
  deleteFast: (id: string) => Promise<boolean>;
  importCsv: (text: string) => Promise<actions.ImportResult | null>;
  exportCsv: () => Promise<string>;
  updateSettings: (changes: Partial<Settings>) => Promise<boolean>;
  clearAll: () => Promise<boolean>;
};

const StoreContext = createContext<Store | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const database = useSQLiteContext();
  const deps = useMemo<actions.Deps>(() => ({ repo: createSqliteRepository(database), newId: randomUUID }), [database]);
  const [loaded, setLoaded] = useState(false);
  const [all, setAll] = useState<Fast[]>([]);
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [justEnded, setJustEnded] = useState<Fast | null>(null);
  const dismissJustEnded = useCallback(() => setJustEnded(null), []);

  const load = useCallback(() => Promise.all([deps.repo.getAll(), deps.repo.getSettings()]), [deps]);

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
    async function write<T>(fn: () => Promise<T>): Promise<T | null> {
      try {
        const result = await fn();
        await reload();
        return result;
      } catch (err) {
        if (err instanceof actions.FastError) notify("Can't save that", err.message);
        else notify('Something went wrong', String(err));
        await reload();
        return null;
      }
    }
    const ok = async (p: Promise<unknown>) => (await p) !== null;
    const done = () => true;

    return {
      loaded,
      fasts: all.filter((f) => f.status !== 'cancelled'),
      active,
      settings,
      justEnded,
      dismissJustEnded,
      startFast: async (goalMinutes, startedAt) => {
        const started = await ok(write(() => actions.startFast(deps, goalMinutes, startedAt)));
        if (started && (settings.goalNotification || settings.forgottenReminder)) {
          // Ask once, at the first fast; reschedule if they just allowed it.
          if (await requestPermission()) await reload();
        }
        return started;
      },
      endFast: async (endedAt) => {
        const ended = await write(() => actions.endFast(deps, endedAt));
        if (ended) setJustEnded(ended);
        return ended !== null;
      },
      cancelFast: () => ok(write(() => actions.cancelFast(deps).then(done))),
      updateActive: (changes) => ok(write(() => actions.updateActive(deps, changes))),
      savePastFast: (input) => ok(write(() => actions.savePastFast(deps, input))),
      deleteFast: (id) => ok(write(() => actions.deleteFast(deps, id).then(done))),
      importCsv: (text) => write(() => actions.importCsv(deps, text)),
      exportCsv: () => actions.exportCsv(deps),
      updateSettings: (changes) => ok(write(() => deps.repo.saveSettings(changes).then(done))),
      clearAll: () => ok(write(() => actions.clearAll(deps).then(done))),
    };
  }, [loaded, all, active, settings, justEnded, dismissJustEnded, deps, reload]);

  return (
    <StoreContext.Provider value={store}>
      <PaletteContext.Provider value={settings.theme}>{children}</PaletteContext.Provider>
    </StoreContext.Provider>
  );
}

export function useStore(): Store {
  const store = useContext(StoreContext);
  if (!store) throw new Error('useStore must be used inside StoreProvider');
  return store;
}
