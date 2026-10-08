import {
  averageMinutes,
  chartBars,
  currentStreak,
  durationMinutes,
  formatClock,
  formatDuration,
  formatGoal,
  groupByWeek,
  isMet,
  longestFast,
  monthResults,
  type Fast,
} from '../fasts';

// Local-time dates so the tests pass in any time zone.
const at = (month: number, day: number, hour = 0, minute = 0) => new Date(2026, month - 1, day, hour, minute);

let n = 0;
function fast(start: Date, hours: number, goalHours = 16, status: Fast['status'] = 'completed'): Fast {
  return {
    id: String(++n),
    startedAt: start.toISOString(),
    endedAt: status === 'active' ? null : new Date(start.getTime() + hours * 3600_000).toISOString(),
    goalMinutes: goalHours * 60,
    note: null,
    status,
  };
}

describe('duration and goal', () => {
  it('measures completed fasts from start to end', () => {
    expect(durationMinutes(fast(at(10, 1, 20), 16.5))).toBe(990);
  });

  it('measures an active fast up to now', () => {
    expect(durationMinutes(fast(at(10, 1, 20), 0, 16, 'active'), at(10, 2, 8))).toBe(720);
  });

  it('meets the goal at exactly the goal length', () => {
    expect(isMet(fast(at(10, 1, 20), 16))).toBe(true);
    expect(isMet(fast(at(10, 1, 20), 15.99))).toBe(false);
  });
});

describe('currentStreak', () => {
  const now = at(10, 8, 12);

  it('counts consecutive met days ending today', () => {
    const fasts = [fast(at(10, 5, 20), 16), fast(at(10, 6, 20), 16), fast(at(10, 7, 20), 16)];
    expect(currentStreak(fasts, now)).toBe(3);
  });

  it('still counts when the last met fast ended yesterday', () => {
    expect(currentStreak([fast(at(10, 5, 20), 16), fast(at(10, 6, 20), 16)], now)).toBe(2);
  });

  it('breaks on a missed day', () => {
    expect(currentStreak([fast(at(10, 5, 20), 16), fast(at(10, 6, 20), 12), fast(at(10, 7, 20), 16)], now)).toBe(1);
  });

  it('is zero when nothing ended today or yesterday', () => {
    expect(currentStreak([fast(at(10, 4, 20), 16)], now)).toBe(0);
  });

  it('ignores active and cancelled fasts', () => {
    expect(currentStreak([fast(at(10, 7, 20), 16, 16, 'cancelled'), fast(at(10, 7, 20), 0, 16, 'active')], now)).toBe(
      0,
    );
  });
});

describe('stats', () => {
  it('finds the longest fast', () => {
    const long = fast(at(10, 2, 20), 20);
    expect(longestFast([fast(at(10, 1, 20), 16), long, fast(at(10, 3, 20), 13)])).toBe(long);
    expect(longestFast([])).toBeNull();
  });

  it('averages fasts that ended within the window', () => {
    const now = at(10, 8, 12);
    const fasts = [fast(at(10, 7, 20), 16), fast(at(10, 1, 20), 14), fast(at(9, 1, 20), 20)];
    expect(averageMinutes(fasts, 7, now)).toBe(15 * 60);
    expect(averageMinutes(fasts, 30, now)).toBe(15 * 60);
    expect(averageMinutes(fasts, 60, now)).toBe((16 + 14 + 20) * 20);
    expect(averageMinutes([], 7, now)).toBeNull();
  });
});

describe('groupByWeek', () => {
  it('groups by the week a fast ends in, newest first', () => {
    const now = at(10, 8, 12); // Thursday
    // Fasts ending Wed Oct 7, Sun Oct 4 and Mon Sep 21.
    const fasts = [fast(at(10, 6, 20), 16), fast(at(10, 3, 20), 16), fast(at(9, 20, 20), 16)];
    const monday = groupByWeek(fasts, 1, now);
    expect(monday.map((g) => [g.title, g.fasts.length])).toEqual([
      ['This week', 1],
      ['Last week', 1],
      ['Week of Sep 21', 1],
    ]);
    // With Sunday starts, the fast ending Sunday Oct 5 joins this week.
    expect(groupByWeek(fasts, 0, now)[0].fasts).toHaveLength(2);
  });
});

describe('monthResults', () => {
  it('marks a day met if any fast that day met its goal', () => {
    const results = monthResults(
      [fast(at(10, 1, 20), 12), fast(at(10, 1, 22), 16), fast(at(10, 3, 20), 12), fast(at(9, 29, 20), 16)],
      at(10, 1),
    );
    expect(Object.fromEntries(results)).toEqual({ '2026-10-02': 'met', '2026-10-04': 'missed' });
  });
});

describe('chartBars', () => {
  const fasts = [fast(at(10, 1, 20), 16), fast(at(10, 2, 2), 4), fast(at(10, 5, 20), 12), fast(at(9, 10, 20), 18)];

  it('sums each of the last 7 days', () => {
    const bars = chartBars(fasts, 'week', at(10, 8, 12));
    expect(bars.map((b) => b.key)).toEqual([
      '2026-10-02',
      '2026-10-03',
      '2026-10-04',
      '2026-10-05',
      '2026-10-06',
      '2026-10-07',
      '2026-10-08',
    ]);
    expect(bars.map((b) => b.minutes / 60)).toEqual([20, 0, 0, 0, 12, 0, 0]);
    expect(bars[6].label).toBe('Thu');
  });

  it('covers the last 30 days by date', () => {
    const bars = chartBars(fasts, 'month', at(10, 8, 12));
    expect(bars).toHaveLength(30);
    expect(bars[0]).toMatchObject({ key: '2026-09-09', label: 'Sep 9' });
    expect(bars.find((b) => b.key === '2026-09-11')?.minutes).toBe(18 * 60);
  });

  it('averages each of the last 12 months per day fasted', () => {
    const bars = chartBars(fasts, 'year', at(10, 8, 12));
    expect(bars).toHaveLength(12);
    expect(bars[11]).toMatchObject({ key: '2026-10', label: 'Oct', minutes: 16 * 60 });
    expect(bars[10]).toMatchObject({ key: '2026-09', minutes: 18 * 60 });
    expect(bars[0]).toMatchObject({ key: '2025-11', minutes: 0 });
  });
});

describe('formatting', () => {
  it('formats durations, goals and the live clock', () => {
    expect(formatDuration(45)).toBe('45 m');
    expect(formatDuration(16 * 60 + 5)).toBe('16 h 05 m');
    expect(formatGoal(960)).toBe('16 h');
    expect(formatGoal(870)).toBe('14 h 30 m');
    expect(formatClock((12 * 3600 + 34 * 60 + 5) * 1000)).toBe('12:34:05');
    expect(formatClock(-1)).toBe('0:00:00');
  });
});
