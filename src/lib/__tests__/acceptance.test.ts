/**
 * The "Auto" acceptance tests from the plan (T4–T15, T17–T19, T24).
 * Each test is named after its plan ID. Times are local; jest.global-setup.js
 * pins the time zone to America/New_York so daylight saving is exercised.
 */
import * as actions from '../actions';
import { FastError, type Deps } from '../actions';
import {
  averageMinutes,
  completedFasts,
  currentStreak,
  dayKey,
  durationMinutes,
  fastDay,
  goalReachedAt,
  groupByWeek,
  isMet,
  longestFast,
  monthResults,
  type Fast,
} from '../fasts';
import { createMemoryRepository } from '../repository';

const at = (month: number, day: number, hour = 0, minute = 0) => new Date(2026, month - 1, day, hour, minute);
const minutes = (n: number) => n * 60_000;
const hours = (n: number) => n * 3_600_000;

/** A fresh in-memory app whose clock can be moved. */
function setup(start = at(10, 8, 12)) {
  let now = start;
  let id = 0;
  const deps: Deps = { repo: createMemoryRepository(), newId: () => `id${++id}`, now: () => now };
  return {
    deps,
    setNow: (d: Date) => (now = d),
    history: async () => completedFasts(await deps.repo.getAll()),
    active: async () => (await deps.repo.getAll()).find((f) => f.status === 'active') ?? null,
  };
}

/** Records a finished fast that started at `start` and lasted `length` ms. */
function addPast(app: ReturnType<typeof setup>, start: Date, length: number, goalMinutes = 960) {
  return actions.savePastFast(app.deps, {
    startedAt: start,
    endedAt: new Date(start.getTime() + length),
    goalMinutes,
  });
}

describe('Timer', () => {
  test('T4: starting while a fast is running is refused; only one active fast', async () => {
    const app = setup();
    await actions.startFast(app.deps, 960);
    await expect(actions.startFast(app.deps, 960)).rejects.toThrow(FastError);
    const all = await app.deps.repo.getAll();
    expect(all.filter((f) => f.status === 'active')).toHaveLength(1);
  });

  test('T5: ending a fast saves it to history with the right duration', async () => {
    const app = setup(at(10, 7, 20));
    await actions.startFast(app.deps, 960);
    app.setNow(new Date(at(10, 7, 20).getTime() + hours(16) + minutes(12)));
    await actions.endFast(app.deps);

    const history = await app.history();
    expect(history).toHaveLength(1);
    expect(durationMinutes(history[0])).toBe(16 * 60 + 12);
    expect(await app.active()).toBeNull();
  });

  test('T5: ending at an earlier chosen time (from the reminder) uses that time', async () => {
    const app = setup(at(10, 6, 20));
    const fast = await actions.startFast(app.deps, 960);
    app.setNow(at(10, 8, 12)); // left running for days
    await actions.endFast(app.deps, goalReachedAt(fast));
    expect(durationMinutes((await app.history())[0])).toBe(960);
  });

  test('T6: cancelling a fast saves nothing to history', async () => {
    const app = setup();
    await actions.startFast(app.deps, 960);
    app.setNow(at(10, 8, 15));
    await actions.cancelFast(app.deps);
    expect(await app.history()).toEqual([]);
    expect(await app.active()).toBeNull();
  });

  test('T7: moving the start 1 h earlier shifts elapsed and goal time by 1 h', async () => {
    const now = at(10, 8, 12);
    const app = setup(new Date(now.getTime() - hours(2)));
    const before = await actions.startFast(app.deps, 960);
    app.setNow(now);

    const after = await actions.updateActive(app.deps, {
      startedAt: new Date(new Date(before.startedAt).getTime() - hours(1)),
    });
    expect(durationMinutes(before, now)).toBe(120);
    expect(durationMinutes(after, now)).toBe(180);
    expect(goalReachedAt(before).getTime() - goalReachedAt(after).getTime()).toBe(hours(1));
  });

  test('T7: a start time in the future is refused and nothing changes', async () => {
    const app = setup();
    const fast = await actions.startFast(app.deps, 960);
    await expect(
      actions.updateActive(app.deps, { startedAt: new Date(at(10, 8, 12).getTime() + minutes(1)) }),
    ).rejects.toThrow("The start can't be in the future.");
    expect((await app.active())?.startedAt).toBe(fast.startedAt);
  });

  test('T7: a fast can start at a chosen earlier time, but not in the future', async () => {
    const app = setup();
    await expect(actions.startFast(app.deps, 960, new Date(at(10, 8, 12).getTime() + minutes(1)))).rejects.toThrow(
      "The start can't be in the future.",
    );
    expect(await app.active()).toBeNull();
    const fast = await actions.startFast(app.deps, 960, at(10, 8, 9, 30));
    expect(fast.startedAt).toBe(at(10, 8, 9, 30).toISOString());
  });
});

describe('Goals', () => {
  test.each([
    ['16 h', 16 * 60],
    ['18 h', 18 * 60],
    ['22 h', 22 * 60],
    ['custom 15 h', 15 * 60],
    ['custom 5 day', 5 * 24 * 60],
  ])('T8: a %s goal is saved on the fast and kept in history', async (_, goal) => {
    const app = setup(at(10, 7, 8));
    await actions.startFast(app.deps, goal);
    expect((await app.active())?.goalMinutes).toBe(goal);
    app.setNow(at(10, 8, 9));
    await actions.endFast(app.deps);
    expect((await app.history())[0].goalMinutes).toBe(goal);
  });

  test('T8: changing the goal of a running fast is saved', async () => {
    const app = setup();
    await actions.startFast(app.deps, 960);
    await actions.updateActive(app.deps, { goalMinutes: 15 * 60 });
    expect((await app.active())?.goalMinutes).toBe(900);
  });

  test('T8: goals of zero or over 7 days are refused', async () => {
    const app = setup();
    await expect(actions.startFast(app.deps, 0)).rejects.toThrow(FastError);
    await expect(actions.startFast(app.deps, 7 * 24 * 60 + 1)).rejects.toThrow(FastError);
    expect(await app.active()).toBeNull();
  });

  test('T9: new fasts use the default goal from Settings; old fasts keep theirs', async () => {
    const app = setup(at(10, 6, 20));
    const first = await actions.startFast(app.deps);
    expect(first.goalMinutes).toBe(960); // 16 h out of the box
    app.setNow(at(10, 7, 12));
    await actions.endFast(app.deps);

    await app.deps.repo.saveSettings({ defaultGoalMinutes: 18 * 60 });
    app.setNow(at(10, 7, 20));
    const second = await actions.startFast(app.deps);
    expect(second.goalMinutes).toBe(18 * 60);
    expect((await app.history())[0].goalMinutes).toBe(960);
  });
});

describe('Rules', () => {
  test('T10: a fast of exactly the goal length counts as met', async () => {
    const app = setup();
    const fast = await addPast(app, at(10, 6, 20), hours(16));
    expect(isMet(fast)).toBe(true);
  });

  test('T11: a fast one minute short of the goal counts as missed', async () => {
    const app = setup();
    const fast = await addPast(app, at(10, 6, 20), hours(16) - minutes(1));
    expect(isMet(fast)).toBe(false);
  });

  test('T12: a fast from 8 PM to noon the next day belongs to the day it ends', async () => {
    const app = setup();
    const fast = await addPast(app, at(10, 5, 20), hours(16)); // Mon 8 PM to Tue noon
    expect(dayKey(fastDay(fast))).toBe('2026-10-06');
    expect(Object.fromEntries(monthResults([fast], at(10, 1)))).toEqual({ '2026-10-06': 'met' });
    // It's in the week of Mon Oct 5 even with Sunday week starts, by its end day.
    expect(groupByWeek([fast], 0, at(10, 8))[0].key).toBe('2026-10-04');
  });

  test('T12: an overnight fast ending on Monday counts for Monday, not the Sunday it started', async () => {
    const app = setup();
    const fast = await addPast(app, at(10, 4, 20), hours(16)); // Sun 8 PM to Mon noon
    // With Monday week starts it's in the week of Oct 5, not the week it started.
    expect(groupByWeek([fast], 1, at(10, 8))[0].key).toBe('2026-10-05');
  });

  test('T13: met fasts yesterday and the day before, none today, is a streak of 2', async () => {
    const app = setup();
    await addPast(app, at(10, 5, 20), hours(16)); // ends Oct 6
    await addPast(app, at(10, 6, 20), hours(16)); // ends Oct 7 (yesterday)
    expect(currentStreak(await app.history(), at(10, 8, 12))).toBe(2);
  });

  test('T14: a missed day breaks the run and the streak restarts after it', async () => {
    const app = setup();
    await addPast(app, at(9, 30, 20), hours(16)); // ends Oct 1, met
    await addPast(app, at(10, 1, 20), hours(16)); // ends Oct 2, met
    await addPast(app, at(10, 2, 20), hours(12)); // ends Oct 3, missed
    await addPast(app, at(10, 3, 20), hours(17)); // ends Oct 4, met
    await addPast(app, at(10, 4, 20), hours(16)); // ends Oct 5, met
    const history = await app.history();
    expect(currentStreak(history, at(10, 5, 18))).toBe(2);
    // A day with no fast at all breaks it too.
    expect(currentStreak(history, at(10, 7, 18))).toBe(0);
  });

  test('T15: a fast across the autumn clock change counts real elapsed hours', async () => {
    const app = setup(at(11, 2, 12));
    // 8 PM Oct 31 to noon Nov 1 on the wall clock; clocks go back 1 h that night.
    const fast = await actions.savePastFast(app.deps, {
      startedAt: at(10, 31, 20),
      endedAt: at(11, 1, 12),
      goalMinutes: 960,
    });
    expect(durationMinutes(fast)).toBe(17 * 60);
    expect(isMet(fast)).toBe(true);
  });

  test('T15: a fast across the spring clock change counts real elapsed hours', async () => {
    const app = setup(at(3, 9, 12));
    // 8 PM Mar 7 to noon Mar 8; clocks go forward 1 h that night.
    const fast = await actions.savePastFast(app.deps, {
      startedAt: at(3, 7, 20),
      endedAt: at(3, 8, 12),
      goalMinutes: 960,
    });
    expect(durationMinutes(fast)).toBe(15 * 60);
    expect(isMet(fast)).toBe(false);
  });

  test('T15: a running fast across the clock change shows real elapsed time', async () => {
    const app = setup(at(10, 31, 20));
    const fast = await actions.startFast(app.deps, 960);
    expect(durationMinutes(fast, at(11, 1, 12))).toBe(17 * 60);
  });
});

describe('History', () => {
  test('T17: editing a past fast’s end time updates duration, met/missed and stats', async () => {
    const app = setup();
    const fast = await addPast(app, at(10, 6, 20), hours(18)); // met, ends Oct 7
    await addPast(app, at(10, 5, 20), hours(16));
    const now = at(10, 8, 12);
    expect(currentStreak(await app.history(), now)).toBe(2);
    expect(durationMinutes(longestFast(await app.history())!)).toBe(18 * 60);

    await actions.savePastFast(app.deps, {
      id: fast.id,
      startedAt: new Date(fast.startedAt),
      endedAt: at(10, 7, 10), // 14 h
      goalMinutes: fast.goalMinutes,
    });
    const history = await app.history();
    const edited = history.find((f) => f.id === fast.id)!;
    expect(history).toHaveLength(2);
    expect(durationMinutes(edited)).toBe(14 * 60);
    expect(isMet(edited)).toBe(false);
    expect(currentStreak(history, now)).toBe(0);
    expect(durationMinutes(longestFast(history)!)).toBe(16 * 60);
    expect(averageMinutes(history, 7, now)).toBe(15 * 60);
    expect(monthResults(history, now).get('2026-10-07')).toBe('missed');
  });

  test('T17: editing to an end before the start is refused and the fast is unchanged', async () => {
    const app = setup();
    const fast = await addPast(app, at(10, 6, 20), hours(16));
    await expect(
      actions.savePastFast(app.deps, {
        id: fast.id,
        startedAt: at(10, 6, 20),
        endedAt: at(10, 6, 19),
        goalMinutes: 960,
      }),
    ).rejects.toThrow('The end has to be after the start.');
    expect((await app.history())[0]).toEqual(fast);
  });

  test('T18: a deleted fast is gone from the list, calendar and stats', async () => {
    const app = setup();
    const keep = await addPast(app, at(10, 5, 20), hours(16));
    const gone = await addPast(app, at(10, 6, 20), hours(20));
    await actions.deleteFast(app.deps, gone.id);

    const history = await app.history();
    const now = at(10, 8, 12);
    expect(history).toEqual([keep]);
    expect(groupByWeek(history, 1, now).flatMap((g) => g.fasts.map((f) => f.id))).toEqual([keep.id]);
    expect(monthResults(history, now).has('2026-10-07')).toBe(false);
    expect(longestFast(history)).toEqual(keep);
    expect(averageMinutes(history, 7, now)).toBe(16 * 60);
    expect(currentStreak(history, now)).toBe(0);
  });

  test('T19: a fast added by hand appears in the right week', async () => {
    const app = setup();
    await addPast(app, at(10, 6, 20), hours(16)); // this week
    await addPast(app, at(9, 21, 20), hours(16), 18 * 60); // ends Tue Sep 22
    const groups = groupByWeek(await app.history(), 1, at(10, 8, 12));
    expect(groups.map((g) => g.title)).toEqual(['This week', 'Week of Sep 21']);
    expect(groups[1].fasts[0].goalMinutes).toBe(18 * 60);
  });

  test('T19: adding a fast whose end is before its start is refused', async () => {
    const app = setup();
    await expect(
      actions.savePastFast(app.deps, { startedAt: at(10, 7, 12), endedAt: at(10, 6, 20), goalMinutes: 960 }),
    ).rejects.toThrow('The end has to be after the start.');
    await expect(
      actions.savePastFast(app.deps, { startedAt: at(10, 7, 12), endedAt: at(10, 7, 12), goalMinutes: 960 }),
    ).rejects.toThrow(FastError);
    expect(await app.history()).toEqual([]);
  });

  test('T19: adding a fast that ends in the future is refused', async () => {
    const app = setup();
    await expect(
      actions.savePastFast(app.deps, { startedAt: at(10, 8, 1), endedAt: at(10, 8, 18), goalMinutes: 960 }),
    ).rejects.toThrow("The end can't be in the future.");
  });
});

describe('Backup', () => {
  test('T24: export, clear all, import gives back exactly the same history and stats', async () => {
    const app = setup();
    const lengths = [16.2, 14.1, 18.5, 16, 17.3, 15.9, 20.1, 13.5];
    for (const [i, h] of lengths.entries()) await addPast(app, at(10, 6 - i, 20 - (i % 3)), hours(h));
    const noted = await addPast(app, at(9, 20, 19), hours(16));
    await actions.savePastFast(app.deps, {
      ...noted,
      startedAt: new Date(noted.startedAt),
      endedAt: new Date(noted.endedAt!),
      note: 'Hard one, "very" hungry\nbut fine',
    });
    const snapshot = async (): Promise<[Fast[], unknown]> => {
      const h = await app.history();
      const now = at(10, 8, 12);
      return [
        h,
        {
          streak: currentStreak(h, now),
          longest: longestFast(h),
          avg7: averageMinutes(h, 7, now),
          avg30: averageMinutes(h, 30, now),
          calendar: [...monthResults(h, now)],
          weeks: groupByWeek(h, 1, now),
        },
      ];
    };
    const before = await snapshot();

    const csv = await actions.exportCsv(app.deps);
    await actions.clearAll(app.deps);
    expect(await app.history()).toEqual([]);
    const result = await actions.importCsv(app.deps, csv);

    expect(result).toEqual({ imported: lengths.length + 1, skipped: 0 });
    expect(await snapshot()).toEqual(before);
  });

  test('T24: importing the same backup twice adds nothing', async () => {
    const app = setup();
    await addPast(app, at(10, 6, 20), hours(16));
    const csv = await actions.exportCsv(app.deps);
    await actions.importCsv(app.deps, csv);
    await actions.importCsv(app.deps, csv);
    expect(await app.history()).toHaveLength(1);
  });

  test('T24: the running fast is not exported, and a running fast in a file is not imported', async () => {
    const app = setup(at(10, 8, 6));
    await addPast(app, at(10, 6, 20), hours(16));
    await actions.startFast(app.deps, 960);
    const csv = await actions.exportCsv(app.deps);
    expect(csv.trim().split('\n')).toHaveLength(2);

    const withActive = csv + 'x,2026-10-08T10:00:00.000Z,,960,,active\n';
    const other = setup();
    expect(await actions.importCsv(other.deps, withActive)).toEqual({ imported: 1, skipped: 1 });
    expect(await other.active()).toBeNull();
  });
});
