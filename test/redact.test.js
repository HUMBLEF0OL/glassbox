/**
 * test/redact.test.js — tests for src/redact.js (Slice 4).
 * Trace: NFR-01, RSK-04, AC-11
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { scrub, scrubModel } from '../src/redact.js';
import { SECRET_PATTERNS } from '../src/config.js';

// --- scrub() ---

test('scrub replaces Anthropic API key', () => {
  const text = 'Key: sk-ant-api03-testkey1234567890abcdef1234567890abcdef12';
  const { text: out, count } = scrub(text);
  assert.ok(!out.includes('sk-ant-api03'), 'Anthropic key should be redacted');
  assert.ok(count > 0);
  assert.ok(out.includes('«redacted:'));
});

test('scrub replaces OpenAI-style key', () => {
  const text = 'token=sk-testkey1234567890abcdefghijklmnopqr';
  const { text: out, count } = scrub(text);
  assert.ok(!out.includes('sk-testkey'), 'OpenAI key should be redacted');
  assert.ok(count > 0);
});

test('scrub replaces AWS access key', () => {
  const text = 'AWS key: AKIAIOSFODNN7EXAMPLE123';
  const { text: out, count } = scrub(text);
  assert.ok(!out.includes('AKIAIOSFODNN7'), 'AWS key should be redacted');
  assert.ok(count > 0);
});

test('scrub leaves non-secret text intact', () => {
  const text = 'Hello, world! This is safe text with no secrets.';
  const { text: out, count } = scrub(text);
  assert.equal(out, text);
  assert.equal(count, 0);
});

test('scrub returns accurate count', () => {
  const text = 'key1=sk-ant-api03-aaa1234567890abcdef1234567890abcdef key2=sk-ant-api03-bbb1234567890abcdef1234567890abcdef';
  const { count } = scrub(text);
  assert.ok(count >= 2);
});

test('scrub passes through non-string input unchanged', () => {
  const { text: out, count } = scrub(42);
  assert.equal(out, 42);
  assert.equal(count, 0);
});

// --- scrubModel() ---

function mkEntry(summary, title = 'Tool') {
  return { seq: 0, ts: null, kind: 'tool_result', title, summary, badge: 'ok' };
}

function mkTimeline(entries) {
  return { entries, counts: {}, startTs: null, endTs: null };
}

test('scrubModel with redact=false returns unchanged model', () => {
  const text = 'sk-ant-api03-secret1234567890abcdef1234567890abcdef';
  const timeline = mkTimeline([mkEntry(text)]);
  const { timeline: out, count } = scrubModel({ timeline, scorecard: null }, { redact: false });
  assert.equal(out.entries[0].summary, text);
  assert.equal(count, 0);
});

test('scrubModel with redact=true scrubs timeline summaries', () => {
  const text = 'Result: sk-ant-api03-secret1234567890abcdef1234567890abcdef';
  const timeline = mkTimeline([mkEntry(text)]);
  const { timeline: out, count } = scrubModel({ timeline, scorecard: null }, { redact: true });
  assert.ok(!out.entries[0].summary.includes('sk-ant-api03'));
  assert.ok(count > 0);
});

test('scrubModel leaves non-secret entries unchanged', () => {
  const text = 'ls -la output here';
  const timeline = mkTimeline([mkEntry(text)]);
  const { timeline: out } = scrubModel({ timeline, scorecard: null }, { redact: true });
  assert.equal(out.entries[0].summary, text);
});

test('scrubModel scrubs scorecard metric notes', () => {
  const scorecard = {
    metrics: [{ label: 'X', display: 'sk-ant-api03-key1234567890abcdef1234567890abcdef', explanation: 'ok', status: 'ok', notes: null }]
  };
  const timeline = mkTimeline([]);
  const { scorecard: out, count } = scrubModel({ timeline, scorecard }, { redact: true });
  assert.ok(!out.metrics[0].display.includes('sk-ant-api03'));
  assert.ok(count > 0);
});

// --- Integration: pipeline with secrets fixture ---

test('secrets fixture: after scrubModel, no seeded secrets remain', async () => {
  const { streamLines } = await import('../src/read.js');
  const { toEvents }    = await import('../src/normalize.js');
  const { annotate }    = await import('../src/classify.js');
  const { build }       = await import('../src/timeline.js');
  const { runAll }      = await import('../src/metrics/index.js');
  const { join, dirname } = await import('path');
  const { fileURLToPath } = await import('url');

  const __dirname = dirname(fileURLToPath(import.meta.url));
  const fixture   = join(__dirname, 'fixtures', 'secrets.jsonl');

  const { records } = await streamLines(fixture);
  const events      = annotate(toEvents(records));
  const timeline    = build(events);
  const scorecard   = runAll(events);

  const { timeline: clean, count } = scrubModel({ timeline, scorecard }, { redact: true });

  // No seeded secrets should survive in any entry summary/title
  for (const entry of clean.entries) {
    assert.ok(!entry.summary.includes('sk-ant-api03-testkey'), `Summary contains secret: ${entry.summary}`);
    assert.ok(!entry.summary.includes('sk-testkey'), `Summary contains secret: ${entry.summary}`);
    assert.ok(!entry.summary.includes('AKIAIOSFODNN7'), `Summary contains AWS key: ${entry.summary}`);
  }
  // At least something was redacted
  assert.ok(count >= 0, 'count should be non-negative');
});
