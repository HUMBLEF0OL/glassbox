/**
 * test/render.compare.test.js — tests for delta computation in src/render/compare.js (Slice 5).
 * Trace: BR-12, OBJ-3, AC-10
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { computeDelta, comparableValue } from '../src/render/compare.js';

function metric(id, raw, display = '') {
  return { id, label: id, display, status: 'ok', explanation: '', notes: null, raw };
}

// --- comparableValue ---

test('comparableValue reads verificationDensity ratio from raw', () => {
  assert.equal(comparableValue(metric('verificationDensity', { edits: 10, verifiesOk: 10, ratio: 1.0 })), 1.0);
});

test('comparableValue returns null for verificationDensity with null ratio (no verifies)', () => {
  assert.equal(comparableValue(metric('verificationDensity', { edits: 5, verifiesOk: 0, ratio: null })), null);
});

test('comparableValue parses grepSemantic ratio string from raw', () => {
  assert.equal(comparableValue(metric('grepSemantic', { searchCount: 8, semanticCount: 2, ratio: '4.0' })), 4.0);
});

test('comparableValue counts overreach distinct session files', () => {
  assert.equal(comparableValue(metric('overreach', { tasks: [], sessionFiles: ['/a.js', '/b.js', '/c.js'], totalOutOfScope: [] })), 3);
});

test('comparableValue sums loopDetection repeated calls and edits', () => {
  const raw = { threshold: 3, repeatedCalls: [{ key: 'Read|x', count: 4 }], repeatedEdits: [{ file: '/a.js', count: 3 }, { file: '/b.js', count: 5 }] };
  assert.equal(comparableValue(metric('loopDetection', raw)), 3);
});

test('comparableValue returns null for non-numeric metrics (earlyVictory)', () => {
  assert.equal(comparableValue(metric('earlyVictory', { raised: true, lastEditSeq: 4 })), null);
});

test('comparableValue returns null for non-numeric metrics (continuity)', () => {
  assert.equal(comparableValue(metric('continuity', { stateRead: false, firstEditSeq: 2 })), null);
});

// --- computeDelta ---

test('computeDelta returns null when either side has no comparable value', () => {
  const a = metric('earlyVictory', { raised: false, reason: 'no-claim' }, 'Not raised');
  const b = metric('earlyVictory', { raised: true, lastEditSeq: 3 }, 'RAISED');
  assert.equal(computeDelta(a, b), null);
});

test('computeDelta reads the actual ratio, not the display string numerator (regression case)', () => {
  // Display strings look like "10 / 10 = 1.0" → "10 / 60 = 6.0"; parseFloat would
  // read 10 and 10 (equal!) but the real ratios are 1.0 → 6.0, a clear regression.
  const a = metric('verificationDensity', { edits: 10, verifiesOk: 10, ratio: 1.0 }, '10 / 10 = 1.0');
  const b = metric('verificationDensity', { edits: 60, verifiesOk: 10, ratio: 6.0 }, '60 / 10 = 6.0');
  const d = computeDelta(a, b);
  assert.ok(d, 'expected a non-null delta');
  assert.equal(d.direction, 'regression');
  assert.equal(d.delta, 5.0);
});

test('computeDelta marks lower verificationDensity ratio as improvement', () => {
  const a = metric('verificationDensity', { edits: 10, verifiesOk: 2, ratio: 5.0 }, '10 / 2 = 5.0');
  const b = metric('verificationDensity', { edits: 10, verifiesOk: 10, ratio: 1.0 }, '10 / 10 = 1.0');
  const d = computeDelta(a, b);
  assert.equal(d.direction, 'improvement');
  assert.equal(d.delta, -4.0);
});

test('computeDelta marks higher grepSemantic search:semantic ratio as regression (less semantic nav)', () => {
  const a = metric('grepSemantic', { searchCount: 4, semanticCount: 4, ratio: '1.0' }, '4 : 4');
  const b = metric('grepSemantic', { searchCount: 8, semanticCount: 1, ratio: '8.0' }, '8 : 1');
  const d = computeDelta(a, b);
  assert.equal(d.direction, 'regression');
});

test('computeDelta marks fewer overreach session files as improvement', () => {
  const a = metric('overreach', { tasks: [], sessionFiles: ['/a.js', '/b.js', '/c.js', '/d.js'], totalOutOfScope: [] }, '4 distinct files changed');
  const b = metric('overreach', { tasks: [], sessionFiles: ['/a.js'], totalOutOfScope: [] }, '1 distinct files changed');
  const d = computeDelta(a, b);
  assert.equal(d.direction, 'improvement');
  assert.equal(d.delta, -3);
});

test('computeDelta marks more loops as regression', () => {
  const a = metric('loopDetection', { threshold: 3, repeatedCalls: [], repeatedEdits: [] }, 'No loops');
  const b = metric('loopDetection', { threshold: 3, repeatedCalls: [{ key: 'Read|x', count: 4 }], repeatedEdits: [] }, '1 loop(s) detected');
  const d = computeDelta(a, b);
  assert.equal(d.direction, 'regression');
  assert.equal(d.delta, 1);
});

test('computeDelta returns neutral when comparable values are equal', () => {
  const a = metric('overreach', { tasks: [], sessionFiles: ['/a.js', '/b.js'], totalOutOfScope: [] }, '2 distinct files changed');
  const b = metric('overreach', { tasks: [], sessionFiles: ['/x.js', '/y.js'], totalOutOfScope: [] }, '2 distinct files changed');
  assert.deepEqual(computeDelta(a, b), { delta: 0, direction: 'neutral' });
});
