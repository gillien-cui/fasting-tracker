import {
  addMonths,
  differenceInCalendarDays,
  format,
  isSameMonth,
  parseISO,
  startOfDay,
  startOfMonth,
  subDays,
} from 'date-fns';
import { dayKey } from './fasts';

export type WeightUnit = 'kg' | 'lb';

/** One weight per day. Kept in kilograms; shown in the unit chosen in Settings. */
export type WeightEntry = {
  /** yyyy-MM-dd, the local day it was logged for. */
  day: string;
  kg: number;
};

export const KG_PER_LB = 0.45359237;
const RANGE: Record<WeightUnit, [number, number]> = { kg: [20, 300], lb: [44, 660] };

/** A weight in the given unit, rounded to 0.1. */
export function toUnit(kg: number, unit: WeightUnit): number {
  return Math.round((unit === 'kg' ? kg : kg / KG_PER_LB) * 10) / 10;
}

export function fromUnit(value: number, unit: WeightUnit): number {
  return unit === 'kg' ? value : value * KG_PER_LB;
}

/** "80.4 kg" */
export function formatWeight(kg: number, unit: WeightUnit): string {
  return `${toUnit(kg, unit).toFixed(1)} ${unit}`;
}

/** "−2.0 kg", "+0.4 kg" or "±0.0 kg" for a change in weight. */
export function formatChange(kg: number, unit: WeightUnit): string {
  const value = toUnit(Math.abs(kg), unit);
  const sign = value === 0 ? '±' : kg < 0 ? '−' : '+';
  return `${sign}${value.toFixed(1)} ${unit}`;
}

/** The whole numbers offered on the weight wheel. */
export function wholeRange(unit: WeightUnit): number[] {
  const [lo, hi] = RANGE[unit];
  return Array.from({ length: hi - lo + 1 }, (_, i) => lo + i);
}

/** Why a weight can't be saved, or null when it can. Pass now = null to allow future days. */
export function weightError(day: string, kg: number, now: Date | null = new Date()): string | null {
  const date = parseISO(day);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day) || isNaN(date.getTime())) return "That day isn't valid.";
  if (now && differenceInCalendarDays(date, now) > 0) return "You can't log a weight for a future day.";
  if (!Number.isFinite(kg) || kg < RANGE.kg[0] || kg > RANGE.kg[1]) return 'That weight looks off.';
  return null;
}

/** Newest first. */
export function sortWeights(weights: WeightEntry[]): WeightEntry[] {
  return [...weights].sort((a, b) => b.day.localeCompare(a.day));
}

export function weightOn(weights: WeightEntry[], day: Date): WeightEntry | null {
  const key = dayKey(day);
  return weights.find((w) => w.day === key) ?? null;
}

export type WeightRange = 'month' | 'year';
/** `x` runs from 0 (start of the range) to 1 (today). */
export type WeightPoint = { key: string; x: number; kg: number; entry: WeightEntry | null };

/**
 * Points for the weight chart. Month: every entry from the last 30 days. Year: one point per month
 * (the last 12), the average of that month's entries.
 */
export function weightPoints(weights: WeightEntry[], range: WeightRange, now: Date = new Date()): WeightPoint[] {
  const today = startOfDay(now);
  const sorted = sortWeights(weights).reverse();
  if (range === 'month') {
    const first = subDays(today, 29);
    return sorted
      .filter((w) => {
        const ago = differenceInCalendarDays(today, parseISO(w.day));
        return ago >= 0 && ago < 30;
      })
      .map((w) => ({ key: w.day, x: differenceInCalendarDays(parseISO(w.day), first) / 29, kg: w.kg, entry: w }));
  }
  const thisMonth = startOfMonth(today);
  const points: WeightPoint[] = [];
  for (let i = 0; i < 12; i++) {
    const month = addMonths(thisMonth, i - 11);
    const inMonth = sorted.filter((w) => isSameMonth(parseISO(w.day), month));
    if (inMonth.length === 0) continue;
    points.push({
      key: format(month, 'yyyy-MM'),
      x: i / 11,
      kg: inMonth.reduce((sum, w) => sum + w.kg, 0) / inMonth.length,
      entry: null,
    });
  }
  return points;
}

/** Labels under the chart: start, middle and end of the range. */
export function weightAxisLabels(range: WeightRange, now: Date = new Date()): string[] {
  const today = startOfDay(now);
  if (range === 'month') return [subDays(today, 29), subDays(today, 15), today].map((d) => format(d, 'MMM d'));
  const thisMonth = startOfMonth(today);
  return [addMonths(thisMonth, -11), addMonths(thisMonth, -6), thisMonth].map((d) => format(d, 'MMM'));
}
