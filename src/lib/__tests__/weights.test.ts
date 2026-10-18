import * as actions from '../actions';
import { csvToBackup, csvToFasts } from '../csv';
import { createMemoryRepository } from '../repository';
import { DEFAULT_SETTINGS } from '../settings';
import { formatChange, formatWeight, fromUnit, toUnit, weightAxisLabels, weightPoints } from '../weights';

const at = (month: number, day: number, hour = 0) => new Date(2026, month - 1, day, hour);
const now = at(10, 17, 12);

function setup() {
  let id = 0;
  return { repo: createMemoryRepository(), newId: () => `id${++id}`, now: () => now };
}

describe('Weight', () => {
  test('is off by default, in kg', () => {
    expect(DEFAULT_SETTINGS.weightTracking).toBe(false);
    expect(DEFAULT_SETTINGS.weightUnit).toBe('kg');
  });

  test('one entry per day: logging the same day again replaces it', async () => {
    const deps = setup();
    await actions.saveWeight(deps, at(10, 17, 8), 81);
    await actions.saveWeight(deps, at(10, 17, 20), 80.4);
    await actions.saveWeight(deps, at(10, 16), 80.6);
    expect(await deps.repo.getWeights()).toEqual([
      { day: '2026-10-17', kg: 80.4 },
      { day: '2026-10-16', kg: 80.6 },
    ]);
    await actions.deleteWeight(deps, '2026-10-16');
    expect(await deps.repo.getWeights()).toEqual([{ day: '2026-10-17', kg: 80.4 }]);
  });

  test('refuses future days and weights that look off', async () => {
    const deps = setup();
    await expect(actions.saveWeight(deps, at(10, 18), 80)).rejects.toThrow("You can't log a weight for a future day.");
    await expect(actions.saveWeight(deps, at(10, 17), 5)).rejects.toThrow('That weight looks off.');
    await expect(actions.saveWeight(deps, at(10, 17), NaN)).rejects.toThrow('That weight looks off.');
  });

  test('converts between kg and lb to one decimal', () => {
    expect(toUnit(80.4, 'kg')).toBe(80.4);
    expect(toUnit(80.4, 'lb')).toBe(177.3);
    expect(toUnit(fromUnit(177.3, 'lb'), 'lb')).toBe(177.3);
    expect(formatWeight(80.4, 'kg')).toBe('80.4 kg');
    expect(formatChange(-2, 'kg')).toBe('−2.0 kg');
    expect(formatChange(0.4, 'kg')).toBe('+0.4 kg');
    expect(formatChange(0.01, 'kg')).toBe('±0.0 kg');
  });

  test('month chart: entries from the last 30 days, placed by date', () => {
    const points = weightPoints(
      [
        { day: '2026-10-17', kg: 80 },
        { day: '2026-09-18', kg: 82 },
        { day: '2026-09-17', kg: 83 },
        { day: '2026-10-02', kg: 81 },
      ],
      'month',
      now,
    );
    expect(points.map((p) => [p.key, p.x, p.kg])).toEqual([
      ['2026-09-18', 0, 82],
      ['2026-10-02', 14 / 29, 81],
      ['2026-10-17', 1, 80],
    ]);
    expect(weightAxisLabels('month', now)).toEqual(['Sep 18', 'Oct 2', 'Oct 17']);
  });

  test('year chart: one point per month, the average of its entries', () => {
    const points = weightPoints(
      [
        { day: '2026-10-17', kg: 80 },
        { day: '2026-10-01', kg: 81 },
        { day: '2025-11-03', kg: 90 },
        { day: '2025-10-31', kg: 99 },
      ],
      'year',
      now,
    );
    expect(points.map((p) => [p.key, p.x, p.kg])).toEqual([
      ['2025-11', 0, 90],
      ['2026-10', 1, 80.5],
    ]);
    expect(weightAxisLabels('year', now)).toEqual(['Nov', 'Apr', 'Oct']);
  });

  test('backup: weights are exported after the fasts and come back on import', async () => {
    const deps = setup();
    await actions.savePastFast(deps, { startedAt: at(10, 15, 20), endedAt: at(10, 16, 12), goalMinutes: 960 });
    await actions.saveWeight(deps, at(10, 16), 80.6);
    await actions.saveWeight(deps, at(10, 17), 80.4);
    const csv = await actions.exportCsv(deps);
    expect(csv).toContain('day,weight_kg\n2026-10-16,80.6\n2026-10-17,80.4\n');
    // Older versions read the fasts and skip the weight lines.
    expect(csvToFasts(csv).fasts).toHaveLength(1);

    await actions.clearAll(deps);
    expect(await deps.repo.getWeights()).toEqual([]);
    expect(await actions.importCsv(deps, csv)).toEqual({ imported: 1, weights: 2, skipped: 0 });
    expect(await deps.repo.getWeights()).toHaveLength(2);
  });

  test('backup: an older file without weights still imports, and bad weight rows are skipped', () => {
    const fastsOnly =
      'id,started_at,ended_at,goal_minutes,note,status\na,2026-10-01T20:00:00Z,2026-10-02T12:00:00Z,960,,completed\n';
    expect(csvToBackup(fastsOnly)).toMatchObject({ weights: [], skipped: 0 });
    expect(csvToBackup(fastsOnly + 'day,weight_kg\n2026-10-02,80\nnope,80\n2026-10-03,abc\n')).toMatchObject({
      weights: [{ day: '2026-10-02', kg: 80 }],
      skipped: 2,
    });
  });
});
