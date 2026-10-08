import { csvToFasts, fastsToCsv } from './csv';
import type { Fast } from './fasts';
import type { FastRepository } from './repository';

/** A change the rules refuse, with a message fit to show the person. */
export class FastError extends Error {}

export const MAX_GOAL_MINUTES = 7 * 24 * 60;

export type Deps = {
  repo: FastRepository;
  newId: () => string;
  now?: () => Date;
};

const nowOf = (deps: Deps) => (deps.now ?? (() => new Date()))();

export function goalError(goalMinutes: number): string | null {
  if (!Number.isInteger(goalMinutes) || goalMinutes <= 0) return 'Pick a goal longer than zero.';
  if (goalMinutes > MAX_GOAL_MINUTES) return 'Goals can be at most 7 days.';
  return null;
}

/** Why a start/end pair isn't allowed, or null when it is. Pass end = null for a running fast. */
export function timesError(start: Date, end: Date | null, now: Date): string | null {
  if (isNaN(start.getTime()) || (end && isNaN(end.getTime()))) return "That time isn't valid.";
  if (start > now) return "The start can't be in the future.";
  if (end && end <= start) return 'The end has to be after the start.';
  if (end && end > now) return "The end can't be in the future.";
  return null;
}

/** The goal implied by moving the goal-reached time, or why that time isn't allowed. */
export function goalFromReachedAt(start: Date, reachedAt: Date): { goalMinutes: number; error: string | null } {
  const goalMinutes = Math.round((reachedAt.getTime() - start.getTime()) / 60000);
  if (goalMinutes <= 0) return { goalMinutes, error: 'The goal has to be after the start.' };
  return { goalMinutes, error: goalError(goalMinutes) };
}

function check(error: string | null): void {
  if (error) throw new FastError(error);
}

async function findActive(repo: FastRepository): Promise<Fast | null> {
  return (await repo.getAll()).find((f) => f.status === 'active') ?? null;
}

/**
 * Starts a fast now, or at a chosen earlier time, with the given goal or the default goal from Settings.
 * Only one fast can run at a time.
 */
export async function startFast(deps: Deps, goalMinutes?: number, startedAt?: Date): Promise<Fast> {
  if (await findActive(deps.repo)) throw new FastError('A fast is already running.');
  const goal = goalMinutes ?? (await deps.repo.getSettings()).defaultGoalMinutes;
  const now = nowOf(deps);
  const start = startedAt ?? now;
  check(timesError(start, null, now));
  check(goalError(goal));
  const fast: Fast = {
    id: deps.newId(),
    startedAt: start.toISOString(),
    endedAt: null,
    goalMinutes: goal,
    note: null,
    status: 'active',
  };
  await deps.repo.upsert([fast]);
  return fast;
}

/** Ends the running fast (now, or at a chosen earlier time) and keeps it in history. */
export async function endFast(deps: Deps, endedAt?: Date): Promise<Fast> {
  const active = await findActive(deps.repo);
  if (!active) throw new FastError("There's no fast running.");
  const now = nowOf(deps);
  const end = endedAt ?? now;
  check(timesError(new Date(active.startedAt), end, now));
  const fast: Fast = { ...active, endedAt: end.toISOString(), status: 'completed' };
  await deps.repo.upsert([fast]);
  return fast;
}

/** Stops the running fast without keeping it in history. */
export async function cancelFast(deps: Deps): Promise<void> {
  const active = await findActive(deps.repo);
  if (!active) return;
  await deps.repo.upsert([{ ...active, endedAt: nowOf(deps).toISOString(), status: 'cancelled' }]);
}

/** Moves the running fast's start time or changes its goal. */
export async function updateActive(deps: Deps, changes: { startedAt?: Date; goalMinutes?: number }): Promise<Fast> {
  const active = await findActive(deps.repo);
  if (!active) throw new FastError("There's no fast running.");
  const start = changes.startedAt ?? new Date(active.startedAt);
  const goal = changes.goalMinutes ?? active.goalMinutes;
  check(timesError(start, null, nowOf(deps)));
  check(goalError(goal));
  const fast: Fast = { ...active, startedAt: start.toISOString(), goalMinutes: goal };
  await deps.repo.upsert([fast]);
  return fast;
}

export type PastFastInput = { id?: string; startedAt: Date; endedAt: Date; goalMinutes: number; note?: string | null };

/** Adds a finished fast by hand, or saves edits to one when `id` is given. */
export async function savePastFast(deps: Deps, input: PastFastInput): Promise<Fast> {
  check(timesError(input.startedAt, input.endedAt, nowOf(deps)));
  check(goalError(input.goalMinutes));
  const fast: Fast = {
    id: input.id ?? deps.newId(),
    startedAt: input.startedAt.toISOString(),
    endedAt: input.endedAt.toISOString(),
    goalMinutes: input.goalMinutes,
    note: input.note?.trim() || null,
    status: 'completed',
  };
  await deps.repo.upsert([fast]);
  return fast;
}

export async function deleteFast(deps: Deps, id: string): Promise<void> {
  await deps.repo.delete(id);
}

/** Every fast as CSV, oldest first. The running fast is left out. */
export async function exportCsv(deps: Deps): Promise<string> {
  const fasts = (await deps.repo.getAll()).filter((f) => f.status !== 'active').reverse();
  return fastsToCsv(fasts);
}

export type ImportResult = { imported: number; skipped: number };

/** Reads a CSV backup. Fasts are matched by id, so importing the same file twice changes nothing. */
export async function importCsv(deps: Deps, text: string): Promise<ImportResult> {
  const { fasts, skipped } = csvToFasts(text);
  const rows = fasts.filter((f) => f.status !== 'active');
  await deps.repo.upsert(rows);
  return { imported: rows.length, skipped: skipped + fasts.length - rows.length };
}

export async function clearAll(deps: Deps): Promise<void> {
  await deps.repo.clearAll();
}
