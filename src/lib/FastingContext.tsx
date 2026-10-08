import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { sortFasts, type Fast } from './fasts';
import { EMPTY_STATE, loadState, saveState, type ActiveFast, type PersistedState } from './storage';

type FastingContextValue = {
  loaded: boolean;
  active: ActiveFast | null;
  history: Fast[];
  goalHours: number;
  setGoalHours: (hours: number) => void;
  startFast: () => void;
  endFast: () => void;
  cancelFast: () => void;
  deleteFast: (id: string) => void;
};

const FastingContext = createContext<FastingContextValue | null>(null);

export function FastingProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<PersistedState>(EMPTY_STATE);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    loadState()
      .then(setState)
      .finally(() => setLoaded(true));
  }, []);

  // Every change goes through here so state on disk always matches the screen.
  const update = useCallback((fn: (prev: PersistedState) => PersistedState) => {
    setState((prev) => {
      const next = fn(prev);
      saveState(next).catch((err) => console.warn('Could not save fasts', err));
      return next;
    });
  }, []);

  const value = useMemo<FastingContextValue>(
    () => ({
      loaded,
      active: state.active,
      history: state.history,
      goalHours: state.goalHours,
      setGoalHours: (hours) =>
        update((prev) => ({
          ...prev,
          goalHours: hours,
          active: prev.active ? { ...prev.active, goalHours: hours } : null,
        })),
      startFast: () =>
        update((prev) =>
          prev.active ? prev : { ...prev, active: { start: Date.now(), goalHours: prev.goalHours } },
        ),
      endFast: () =>
        update((prev) => {
          if (!prev.active) return prev;
          const fast: Fast = {
            id: String(prev.active.start),
            start: prev.active.start,
            end: Date.now(),
            goalHours: prev.active.goalHours,
          };
          return { ...prev, active: null, history: sortFasts([fast, ...prev.history]) };
        }),
      cancelFast: () => update((prev) => ({ ...prev, active: null })),
      deleteFast: (id) => update((prev) => ({ ...prev, history: prev.history.filter((f) => f.id !== id) })),
    }),
    [loaded, state, update],
  );

  return <FastingContext.Provider value={value}>{children}</FastingContext.Provider>;
}

export function useFasting(): FastingContextValue {
  const ctx = useContext(FastingContext);
  if (!ctx) throw new Error('useFasting must be used inside FastingProvider');
  return ctx;
}
