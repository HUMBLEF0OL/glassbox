/**
 * test/timeline.test.js — tests for src/timeline.js (Slice 2).
 * Trace: BR-03, TSD §3.2
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { build } from '../src/timeline.js';

function makeEvent(overrides) {
  return {
    seq: 0, type: 'user', ts: '2026-01-01T00:00:00.000Z', uuid: 'u1',
    text: null, tool: null, result: null, warnings: [], raw: {},
    ...overrides,
  };
}

const SAMPLE_EVENTS = [
  makeEvent({ seq: 0, type: 'user',   ts: '2026-01-01T10:00:00.000Z', text: 'implement the feature' }),
  makeEvent({ seq: 1, type: 'assistant', ts: '2026-01-01T10:00:01.000Z', text: 'I will start with reading the files.' }),
  makeEvent({ seq: 2, type: 'tool_call',  ts: '2026-01-01T10:00:02.000Z',
    tool: { id: 'tu1', name: 'Read', category: 'read', targets: ['/src/cli.js'], command: null } }),
  makeEvent({ seq: 3, type: 'tool_result', ts: '2026-01-01T10:00:03.000Z',
    result: { ok: true, raw: { type: 'text', file: { filePath: '/src/cli.js', content: 'code' } } } }),
  makeEvent({ seq: 4, type: 'tool_call',  ts: '2026-01-01T10:00:04.000Z',
    tool: { id: 'tu2', name: 'Edit', category: 'edit', targets: ['/src/cli.js'], command: null } }),
  makeEvent({ seq: 5, type: 'tool_result', ts: '2026-01-01T10:00:05.000Z',
    result: { ok: false, raw: { stdout: 'error: something failed', stderr: '', interrupted: false } } }),
];

test('entries are ordered by seq', () => {
  const { entries } = build([...SAMPLE_EVENTS].reverse()); // pass reversed to test sort
  for (let i = 1; i < entries.length; i++) {
    assert.ok(entries[i].seq > entries[i - 1].seq, `entry ${i} seq should be > entry ${i-1} seq`);
  }
});

test('counts total match input length', () => {
  const { counts } = build(SAMPLE_EVENTS);
  const total = Object.values(counts).reduce((a, b) => a + b, 0);
  assert.equal(total, SAMPLE_EVENTS.length);
});

test('counts break down by type', () => {
  const { counts } = build(SAMPLE_EVENTS);
  assert.equal(counts.user, 1);
  assert.equal(counts.assistant, 1);
  assert.equal(counts.tool_call, 2);
  assert.equal(counts.tool_result, 2);
});

test('startTs is the first non-null ts', () => {
  const { startTs } = build(SAMPLE_EVENTS);
  assert.equal(startTs, '2026-01-01T10:00:00.000Z');
});

test('endTs is the last non-null ts', () => {
  const { endTs } = build(SAMPLE_EVENTS);
  assert.equal(endTs, '2026-01-01T10:00:05.000Z');
});

test('long text is truncated in summary', () => {
  const longText = 'x'.repeat(300);
  const { entries } = build([makeEvent({ text: longText })]);
  assert.ok(entries[0].summary.length < 300);
  assert.ok(entries[0].summary.endsWith('…'));
});

test('tool_call entry uses tool name as title', () => {
  const { entries } = build([makeEvent({
    type: 'tool_call',
    tool: { id: 'tu1', name: 'Bash', category: 'bash', targets: [], command: 'verify' },
  })]);
  assert.equal(entries[0].title, 'Bash');
  assert.equal(entries[0].badge, 'bash');
});

test('tool_result with ok=true → badge=ok', () => {
  const { entries } = build([makeEvent({
    type: 'tool_result',
    result: { ok: true, raw: { stdout: 'passed' } },
  })]);
  assert.equal(entries[0].badge, 'ok');
});

test('tool_result with ok=false → badge=error', () => {
  const { entries } = build([makeEvent({
    type: 'tool_result',
    result: { ok: false, raw: {} },
  })]);
  assert.equal(entries[0].badge, 'error');
});

test('startTs/endTs are null when no events have timestamps', () => {
  const { startTs, endTs } = build([makeEvent({ ts: null })]);
  assert.equal(startTs, null);
  assert.equal(endTs, null);
});

test('empty events array produces empty timeline', () => {
  const { entries, counts, startTs, endTs } = build([]);
  assert.equal(entries.length, 0);
  assert.deepEqual(counts, {});
  assert.equal(startTs, null);
  assert.equal(endTs, null);
});
