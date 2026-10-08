/// <reference types="node" />
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { computeStats, formatClock, formatDuration, metGoal, sortFasts, type Fast } from './fasts.ts';

const HOUR = 60 * 60 * 1000;
const fast = (id: string, start: number, hours: number, goalHours = 16): Fast => ({
  id,
  start,
  end: start + hours * HOUR,
  goalHours,
});

test('formatClock pads minutes and seconds', () => {
  assert.equal(formatClock(0), '0:00:00');
  assert.equal(formatClock(16 * HOUR + 4 * 60000 + 9000), '16:04:09');
  assert.equal(formatClock(-5), '0:00:00');
});

test('formatDuration drops hours under one hour', () => {
  assert.equal(formatDuration(45 * 60000), '45m');
  assert.equal(formatDuration(16.5 * HOUR), '16h 30m');
});

test('metGoal compares duration to the goal', () => {
  assert.equal(metGoal(fast('a', 0, 16)), true);
  assert.equal(metGoal(fast('b', 0, 15.9)), false);
});

test('sortFasts puts newest first without mutating', () => {
  const input = [fast('old', 0, 1), fast('new', 10 * HOUR, 1)];
  assert.deepEqual(sortFasts(input).map((f) => f.id), ['new', 'old']);
  assert.equal(input[0].id, 'old');
});

test('computeStats summarizes fasts', () => {
  assert.deepEqual(computeStats([]), { count: 0, averageMs: 0, longestMs: 0, goalsMet: 0 });
  const stats = computeStats([fast('a', 0, 12), fast('b', 0, 18)]);
  assert.equal(stats.count, 2);
  assert.equal(stats.averageMs, 15 * HOUR);
  assert.equal(stats.longestMs, 18 * HOUR);
  assert.equal(stats.goalsMet, 1);
});
