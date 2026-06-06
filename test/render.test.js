/**
 * test/render.test.js — tests for src/render/report.js (Slice 2).
 * Trace: AC-11, NFR-07
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { report } from '../src/render/report.js';
import { build } from '../src/timeline.js';

function makeEvent(overrides) {
  return {
    seq: 0, type: 'user', ts: '2026-01-01T00:00:00.000Z', uuid: 'u1',
    text: 'hello', tool: null, result: null, warnings: [], raw: {},
    ...overrides,
  };
}

const SAMPLE_EVENTS = [
  makeEvent({ seq: 0, type: 'user', text: 'write a feature' }),
  makeEvent({ seq: 1, type: 'assistant', text: 'I will help you.' }),
  makeEvent({ seq: 2, type: 'tool_call',
    tool: { id: 'tu1', name: 'Edit', category: 'edit', targets: ['/src/cli.js'], command: null } }),
  makeEvent({ seq: 3, type: 'tool_result',
    result: { ok: true, raw: { type: 'text', file: { filePath: '/src/cli.js', content: 'code' } } } }),
];

const META = {
  file: '/path/to/session.jsonl',
  generatedAt: '2026-01-01T12:00:00.000Z',
  eventCount: 4,
  skipped: 0,
  sensitivityWarning: true,
};

function makeReport(opts = {}) {
  const timeline = build(SAMPLE_EVENTS);
  return report({ timeline, meta: { ...META, ...opts.meta }, scorecard: opts.scorecard ?? null });
}

test('report contains timeline entries', () => {
  const html = makeReport();
  assert.ok(html.includes('write a feature'));
  assert.ok(html.includes('I will help you.'));
  assert.ok(html.includes('Edit'));
});

test('HTML contains no external URLs (AC-11)', () => {
  const html = makeReport();
  assert.ok(!html.includes('http://'), 'should not have http:// links');
  assert.ok(!html.includes('https://'), 'should not have https:// links');
  assert.ok(!html.includes('//cdn'), 'should not have CDN references');
});

test('HTML contains no external link rel tags (AC-11)', () => {
  const html = makeReport();
  assert.ok(!/<link\s+rel=/i.test(html), 'should not have <link rel= tags');
});

test('HTML contains no fetch() calls (AC-11)', () => {
  const html = makeReport();
  assert.ok(!html.includes('fetch('), 'should not have fetch() calls');
});

test('sensitivity warning appears when sensitivityWarning=true', () => {
  const html = makeReport({ meta: { sensitivityWarning: true } });
  assert.ok(html.includes('sensitive content'));
});

test('no warning when sensitivityWarning=false', () => {
  const html = makeReport({ meta: { sensitivityWarning: false } });
  assert.ok(!html.includes('sensitive content'));
});

test('report is a complete HTML document', () => {
  const html = makeReport();
  assert.ok(html.startsWith('<!DOCTYPE html>'));
  assert.ok(html.includes('</html>'));
});

test('scorecard placeholder shown when scorecard=null', () => {
  const html = makeReport();
  assert.ok(html.includes('Slice 3'));
});

test('scorecard rendered when provided', () => {
  const scorecard = {
    metrics: [
      { label: 'Grep vs Semantic', display: '5:0', explanation: 'Text search only', status: 'unknown', notes: null },
    ],
  };
  const html = makeReport({ scorecard });
  assert.ok(html.includes('Grep vs Semantic'));
  assert.ok(html.includes('5:0'));
});
