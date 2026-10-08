export type Fast = {
  id: string;
  /** Epoch milliseconds. */
  start: number;
  /** Epoch milliseconds. */
  end: number;
  goalHours: number;
};

export const GOAL_OPTIONS = [12, 14, 16, 18, 20, 24];
export const DEFAULT_GOAL_HOURS = 16;

const HOUR = 60 * 60 * 1000;

export function durationMs(fast: Pick<Fast, 'start' | 'end'>): number {
  return Math.max(0, fast.end - fast.start);
}

export function metGoal(fast: Fast): boolean {
  return durationMs(fast) >= fast.goalHours * HOUR;
}

/** Live timer format, e.g. "16:04:09". */
export function formatClock(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  return [h, m, s].map((n, i) => (i === 0 ? String(n) : String(n).padStart(2, '0'))).join(':');
}

/** Compact duration, e.g. "16h 4m". */
export function formatDuration(ms: number): string {
  const totalMinutes = Math.max(0, Math.floor(ms / 60000));
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  if (h === 0) return `${m}m`;
  return `${h}h ${m}m`;
}

/** Newest first. */
export function sortFasts(fasts: Fast[]): Fast[] {
  return [...fasts].sort((a, b) => b.start - a.start);
}

export type Stats = {
  count: number;
  averageMs: number;
  longestMs: number;
  goalsMet: number;
};

export function computeStats(fasts: Fast[]): Stats {
  if (fasts.length === 0) return { count: 0, averageMs: 0, longestMs: 0, goalsMet: 0 };
  const durations = fasts.map(durationMs);
  const total = durations.reduce((sum, d) => sum + d, 0);
  return {
    count: fasts.length,
    averageMs: total / fasts.length,
    longestMs: Math.max(...durations),
    goalsMet: fasts.filter(metGoal).length,
  };
}
