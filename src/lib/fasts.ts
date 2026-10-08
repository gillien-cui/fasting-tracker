import {
  addMinutes,
  differenceInCalendarDays,
  differenceInMinutes,
  format,
  isSameMonth,
  startOfDay,
  startOfWeek,
  subDays,
  subWeeks,
} from 'date-fns';

export type FastStatus = 'active' | 'completed' | 'cancelled';

export type Fast = {
  id: string;
  /** ISO timestamp (UTC). */
  startedAt: string;
  /** ISO timestamp (UTC); null while the fast is active. */
  endedAt: string | null;
  goalMinutes: number;
  note: string | null;
  status: FastStatus;
};

export type WeekStart = 0 | 1;

export const GOAL_PRESETS_HOURS = [13, 16, 18, 20, 24];
export const DEFAULT_GOAL_MINUTES = 16 * 60;

export function durationMinutes(fast: Fast, now: Date = new Date()): number {
  const end = fast.endedAt ? new Date(fast.endedAt) : now;
  return Math.max(0, differenceInMinutes(end, new Date(fast.startedAt)));
}

/** A fast meets its goal when its duration is at least the goal length. */
export function isMet(fast: Fast, now?: Date): boolean {
  return durationMinutes(fast, now) >= fast.goalMinutes;
}

export function goalReachedAt(fast: Fast): Date {
  return addMinutes(new Date(fast.startedAt), fast.goalMinutes);
}

/** A fast belongs to the day it ends on. */
export function fastDay(fast: Fast): Date {
  return startOfDay(new Date(fast.endedAt ?? fast.startedAt));
}

export function dayKey(date: Date): string {
  return format(date, 'yyyy-MM-dd');
}

export function completedFasts(fasts: Fast[]): Fast[] {
  return fasts
    .filter((f) => f.status === 'completed' && f.endedAt)
    .sort((a, b) => b.endedAt!.localeCompare(a.endedAt!));
}

/** Consecutive days with a met fast, ending today or yesterday. */
export function currentStreak(fasts: Fast[], now: Date = new Date()): number {
  const metDays = new Set(
    completedFasts(fasts)
      .filter((f) => isMet(f))
      .map((f) => dayKey(fastDay(f))),
  );
  let day = startOfDay(now);
  if (!metDays.has(dayKey(day))) day = subDays(day, 1);
  let streak = 0;
  while (metDays.has(dayKey(day))) {
    streak += 1;
    day = subDays(day, 1);
  }
  return streak;
}

export function longestFast(fasts: Fast[]): Fast | null {
  let best: Fast | null = null;
  for (const f of completedFasts(fasts)) {
    if (!best || durationMinutes(f) > durationMinutes(best)) best = f;
  }
  return best;
}

/** Average duration of fasts that ended in the last `days` days, today included. */
export function averageMinutes(fasts: Fast[], days: number, now: Date = new Date()): number | null {
  const today = startOfDay(now);
  const recent = completedFasts(fasts).filter((f) => {
    const ago = differenceInCalendarDays(today, fastDay(f));
    return ago >= 0 && ago < days;
  });
  if (recent.length === 0) return null;
  return recent.reduce((sum, f) => sum + durationMinutes(f), 0) / recent.length;
}

export type WeekGroup = { key: string; title: string; fasts: Fast[] };

/** Completed fasts grouped by the week they ended in, newest first. */
export function groupByWeek(fasts: Fast[], weekStartsOn: WeekStart, now: Date = new Date()): WeekGroup[] {
  const thisWeek = startOfWeek(now, { weekStartsOn });
  const lastWeek = subWeeks(thisWeek, 1);
  const groups = new Map<string, WeekGroup>();
  for (const f of completedFasts(fasts)) {
    const week = startOfWeek(fastDay(f), { weekStartsOn });
    const key = dayKey(week);
    if (!groups.has(key)) {
      const title =
        key === dayKey(thisWeek)
          ? 'This week'
          : key === dayKey(lastWeek)
            ? 'Last week'
            : `Week of ${format(week, 'MMM d')}`;
      groups.set(key, { key, title, fasts: [] });
    }
    groups.get(key)!.fasts.push(f);
  }
  return [...groups.values()];
}

export type DayResult = 'met' | 'missed';

/** For each day of `month` with a completed fast: met if any fast that day met its goal. */
export function monthResults(fasts: Fast[], month: Date): Map<string, DayResult> {
  const results = new Map<string, DayResult>();
  for (const f of completedFasts(fasts)) {
    const day = fastDay(f);
    if (!isSameMonth(day, month)) continue;
    const key = dayKey(day);
    if (isMet(f)) results.set(key, 'met');
    else if (!results.has(key)) results.set(key, 'missed');
  }
  return results;
}

/** "16 h 05 m", or "45 m" under an hour. */
export function formatDuration(minutes: number): string {
  const total = Math.max(0, Math.floor(minutes));
  const h = Math.floor(total / 60);
  const m = total % 60;
  if (h === 0) return `${m} m`;
  return `${h} h ${String(m).padStart(2, '0')} m`;
}

/** "16 h" or "16 h 30 m" for a goal length. */
export function formatGoal(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m === 0 ? `${h} h` : `${h} h ${m} m`;
}

/** Live timer, e.g. "12:34:05". */
export function formatClock(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export function formatTime(date: Date, clock24: boolean): string {
  return format(date, clock24 ? 'HH:mm' : 'h:mm a');
}

/** Time with a weekday when it isn't today, e.g. "Tue 7:30 PM". */
export function formatDayTime(date: Date, clock24: boolean, now: Date = new Date()): string {
  const time = formatTime(date, clock24);
  const ago = differenceInCalendarDays(now, date);
  if (ago === 0) return time;
  if (ago === 1) return `yesterday ${time}`;
  if (ago === -1) return `tomorrow ${time}`;
  return `${format(date, 'EEE MMM d')} ${time}`;
}
