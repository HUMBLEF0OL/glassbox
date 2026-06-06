/**
 * test/read.test.js — tests for src/read.js (Slice 1).
 * Trace: AC-12, NFR-05
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { streamLines } from '../src/read.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const FIXTURES = join(__dirname, 'fixtures');

test('clean fixture: skipped===0 and all records parsed', async () => {
  const { records, skipped, total } = await streamLines(join(FIXTURES, 'clean.jsonl'));
  assert.equal(skipped, 0);
  assert.ok(records.length > 0);
  assert.equal(total, records.length);
});

test('malformed fixture: completes and skipped equals count of bad lines', async () => {
  const { records, skipped, total } = await streamLines(join(FIXTURES, 'malformed.jsonl'));
  // malformed.jsonl has 2 invalid lines: "{invalid json here" and "truncated: {broken"
  assert.equal(skipped, 2);
  assert.ok(records.length > 0);
  assert.equal(total, records.length + skipped);
});

test('skipped + parsed = total for clean fixture', async () => {
  const { records, skipped, total } = await streamLines(join(FIXTURES, 'clean.jsonl'));
  assert.equal(records.length + skipped, total);
});

test('empty lines are not counted', async () => {
  // malformed.jsonl contains a blank line — it should not count toward total
  const { total } = await streamLines(join(FIXTURES, 'malformed.jsonl'));
  // file has 7 non-empty lines (2 bad + 5 good)
  assert.equal(total, 7);
});
