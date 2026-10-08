import { csvToFasts, fastsToCsv, parseCsvRows } from '../csv';
import type { Fast } from '../fasts';

const sample: Fast[] = [
  {
    id: 'a',
    startedAt: '2026-10-06T19:30:00.000Z',
    endedAt: '2026-10-07T11:42:00.000Z',
    goalMinutes: 960,
    note: 'Felt good, "easy" one\nslept well',
    status: 'completed',
  },
  {
    id: 'b',
    startedAt: '2026-10-05T19:00:00.000Z',
    endedAt: '2026-10-06T09:05:00.000Z',
    goalMinutes: 960,
    note: null,
    status: 'cancelled',
  },
];

describe('csv', () => {
  it('round-trips fasts, including notes with quotes, commas and newlines', () => {
    expect(csvToFasts(fastsToCsv(sample))).toEqual({ fasts: sample, skipped: 0 });
  });

  it('parses quoted fields and CRLF line endings', () => {
    expect(parseCsvRows('a,"b,c"\r\n"d""e",f\r\n')).toEqual([
      ['a', 'b,c'],
      ['d"e', 'f'],
    ]);
  });

  it('skips rows that do not make sense', () => {
    const csv = [
      'id,started_at,ended_at,goal_minutes,note,status',
      'ok,2026-10-01T20:00:00Z,2026-10-02T12:00:00Z,960,,completed',
      'bad-date,yesterday,2026-10-02T12:00:00Z,960,,completed',
      'ends-first,2026-10-02T12:00:00Z,2026-10-01T20:00:00Z,960,,completed',
      'no-goal,2026-10-01T20:00:00Z,2026-10-02T12:00:00Z,,,completed',
      'bad-status,2026-10-01T20:00:00Z,2026-10-02T12:00:00Z,960,,done',
    ].join('\n');
    const result = csvToFasts(csv);
    expect(result.fasts.map((f) => f.id)).toEqual(['ok']);
    expect(result.skipped).toBe(4);
  });

  it('rejects files without the expected columns', () => {
    expect(() => csvToFasts('date,hours\n2026-10-01,16\n')).toThrow(/doesn't look like a fasting backup/);
    expect(() => csvToFasts('')).toThrow(/empty/);
  });
});
