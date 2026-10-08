import type { Fast, FastStatus } from './fasts';

const COLUMNS = ['id', 'started_at', 'ended_at', 'goal_minutes', 'note', 'status'] as const;
const STATUSES: FastStatus[] = ['active', 'completed', 'cancelled'];

function escape(value: string): string {
  return /[",\r\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}

export function fastsToCsv(fasts: Fast[]): string {
  const rows = fasts.map((f) =>
    [f.id, f.startedAt, f.endedAt ?? '', String(f.goalMinutes), f.note ?? '', f.status].map(escape).join(','),
  );
  return [COLUMNS.join(','), ...rows].join('\n') + '\n';
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

/** Reads a CSV made by fastsToCsv. Rows that don't make sense are skipped and counted. */
export function csvToFasts(text: string): CsvImport {
  const [header, ...rows] = parseCsvRows(text.replace(/^﻿/, ''));
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
