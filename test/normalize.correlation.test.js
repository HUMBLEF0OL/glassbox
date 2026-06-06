/**
 * test/normalize.correlation.test.js — tool_result → tool_call correlation (Slice 1/3).
 *
 * Regression guard for the multi-tool-per-assistant-record case: when one assistant
 * record emits several tool_use blocks, each result must be paired to the correct call
 * by its block id (result.toolUseId), not just the shared assistant-record uuid.
 *
 * Trace: RSK-01, BR-05, BR-06
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join, dirname } from 'node:path';
import { toEvents } from '../src/normalize.js';
import { annotate } from '../src/classify.js';
import { compute as verificationDensity } from '../src/metrics/verificationDensity.js';
import { compute as earlyVictory } from '../src/metrics/earlyVictory.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

function loadFixture(name) {
  const text = readFileSync(join(__dirname, 'fixtures', name), 'utf8');
  return text.split('\n').filter(Boolean).map(l => JSON.parse(l));
}

test('correlateResults assigns each result its originating block id, in order', () => {
  const events = toEvents(loadFixture('multi-tool-verify.jsonl'));
  const results = events.filter(e => e.type === 'tool_result');
  // First result pairs to the Edit block, second to the Bash (verify) block.
  assert.equal(results[0].result.toolUseId, 'tu_edit');
  assert.equal(results[1].result.toolUseId, 'tu_verify');
});

test('verificationDensity counts the verify even when not the first call in the record', () => {
  const events = annotate(toEvents(loadFixture('multi-tool-verify.jsonl')));
  const r = verificationDensity(events);
  assert.equal(r.raw.edits, 1);
  assert.equal(r.raw.verifiesOk, 1);
  assert.equal(r.status, 'ok');
});

test('earlyVictory not raised: claim is backed by the correctly-correlated passing verify', () => {
  const events = annotate(toEvents(loadFixture('multi-tool-verify.jsonl')));
  const r = earlyVictory(events);
  assert.equal(r.raw.raised, false);
  assert.equal(r.status, 'ok');
});
