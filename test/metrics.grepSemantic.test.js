/**
 * test/metrics.grepSemantic.test.js (Slice 3, BR-04/AC-03)
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { compute } from '../src/metrics/grepSemantic.js';

function mkTool(seq, category) {
  return { seq, type: 'tool_call', ts: null, uuid: `e${seq}`, text: null,
    tool: { id: `t${seq}`, name: 'X', category, targets: [], command: null, input: {} },
    result: null, warnings: [], raw: {} };
}

test('normal path: search + semantic counted and ratio displayed', () => {
  const events = [mkTool(0,'search'), mkTool(1,'search'), mkTool(2,'semantic')];
  const r = compute(events);
  assert.equal(r.raw.searchCount, 2);
  assert.equal(r.raw.semanticCount, 1);
  assert.equal(r.status, 'ok');
  assert.ok(r.display.includes('2'));
  assert.ok(r.display.includes('1'));
});

test('degraded path: no semantic → status=unknown', () => {
  const events = [mkTool(0,'search'), mkTool(1,'search')];
  const r = compute(events);
  assert.equal(r.status, 'unknown');
  assert.equal(r.raw.semanticCount, 0);
});

test('degraded path: no tools at all → status=unknown with note', () => {
  const r = compute([]);
  assert.equal(r.status, 'unknown');
  assert.ok(r.notes.length > 0);
});

test('only semantic tools → normal path', () => {
  const events = [mkTool(0,'semantic')];
  const r = compute(events);
  assert.equal(r.status, 'ok');
  assert.equal(r.raw.searchCount, 0);
  assert.equal(r.raw.semanticCount, 1);
});
