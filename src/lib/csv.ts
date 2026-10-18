import type { Fast, FastStatus } from './fasts';
import { weightError, type WeightEntry } from './weights';

const COLUMNS = ['id', 'started_at', 'ended_at', 'goal_minutes', 'note', 'status'] as const;
const STATUSES: FastStatus[] = ['active', 'completed', 'cancelled'];
/** Weights follow the fasts in the same file, under their own header row. */
const WEIGHT_COLUMNS = ['day', 'weight_kg'] as const;

function escape(value: string): string {
  return /[",\r\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}

export function fastsToCsv(fasts: Fast[]): string {
  const rows = fasts.map((f) =>
    [f.id, f.startedAt, f.endedAt ?? '', String(f.goalMinutes), f.note ?? '', f.status].map(escape).join(','),
  );
  return [COLUMNS.join(','), ...rows].join('\n') + '\n';
}

/** A full backup: the fasts, then the weights (when there are any) under their own header. */
export function backupToCsv(fasts: Fast[], weights: WeightEntry[]): string {
  if (weights.length === 0) return fastsToCsv(fasts);
  const rows = weights.map((w) => `${w.day},${Math.round(w.kg * 1000) / 1000}`);
  return fastsToCsv(fasts) + [WEIGHT_COLUMNS.join(','), ...rows].join('\n') + '\n';
}

/** RFC 4180 style: quoted fields may contain commas, quotes ("") and newlines. */
export function parseCsvRows(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') {
        field += '"';
        i++;
      } else if (c === '"') {
        quoted = false;
      } else {
        field += c;
      }
    } else if (c === '"') {
      quoted = true;
    } else if (c === ',') {
      row.push(field);
      field = '';
    } else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++;
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
    } else {
      field += c;
    }
  }
  if (field !== '' || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows.filter((r) => r.some((v) => v.trim() !== ''));
}

export type CsvImport = { fasts: Fast[]; skipped: number };
export type BackupImport = CsvImport & { weights: WeightEntry[] };

const readRows = (text: string) => parseCsvRows(text.replace(/^﻿/, ''));

/** Reads a CSV made by fastsToCsv. Rows that don't make sense are skipped and counted. */
export function csvToFasts(text: string): CsvImport {
  return rowsToFasts(readRows(text));
}

/** Reads a backup made by backupToCsv, or an older one with fasts only. */
export function csvToBackup(text: string): BackupImport {
  const rows = readRows(text);
  const split = rows.findIndex((r) => r[0]?.trim() === WEIGHT_COLUMNS[0] && r[1]?.trim() === WEIGHT_COLUMNS[1]);
  const { fasts, skipped } = rowsToFasts(split < 0 ? rows : rows.slice(0, split));
  const weights: WeightEntry[] = [];
  let skippedWeights = 0;
  for (const r of split < 0 ? [] : rows.slice(split + 1)) {
    const day = (r[0] ?? '').trim();
    const kg = Number((r[1] ?? '').trim());
    if (weightError(day, kg, null)) skippedWeights++;
    else weights.push({ day, kg });
  }
  return { fasts, weights, skipped: skipped + skippedWeights };
}

function rowsToFasts([header, ...rows]: string[][]): CsvImport {
  if (!header) throw new Error('The file is empty.');
  const index = Object.fromEntries(COLUMNS.map((c) => [c, header.indexOf(c)]));
  const missing = COLUMNS.filter((c) => c !== 'note' && index[c] < 0);
  if (missing.length > 0) throw new Error(`This doesn't look like a fasting backup (missing ${missing.join(', ')}).`);

  const fasts: Fast[] = [];
  let skipped = 0;
  for (const r of rows) {
    const get = (c: (typeof COLUMNS)[number]) => (index[c] >= 0 ? (r[index[c]] ?? '').trim() : '');
    const startedAt = new Date(get('started_at'));
    const endedAt = get('ended_at') ? new Date(get('ended_at')) : null;
    const goalMinutes = Number(get('goal_minutes'));
    const status = get('status') as FastStatus;
    const valid =
      get('id') !== '' &&
      !isNaN(startedAt.getTime()) &&
      (endedAt === null || (!isNaN(endedAt.getTime()) && endedAt >= startedAt)) &&
      Number.isFinite(goalMinutes) &&
      goalMinutes > 0 &&
      STATUSES.includes(status) &&
      (status === 'active') === (endedAt === null);
    if (!valid) {
      skipped++;
      continue;
    }
    fasts.push({
      id: get('id'),
      startedAt: startedAt.toISOString(),
      endedAt: endedAt ? endedAt.toISOString() : null,
      goalMinutes: Math.round(goalMinutes),
      note: get('note') || null,
      status,
    });
  }
  return { fasts, skipped };
}
