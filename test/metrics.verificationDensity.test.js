/**
 * test/metrics.verificationDensity.test.js (Slice 3, BR-06/AC-05)
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { compute } from '../src/metrics/verificationDensity.js';

function mkEdit(seq) {
  return { seq, type: 'tool_call', ts: null, uuid: `ae${seq}`, text: null,
    tool: { id: `t${seq}`, name: 'Edit', category: 'edit', targets: [], command: null, input: {} },
    result: null, warnings: [], raw: {} };
}

function mkVerifyCall(seq) {
  return { seq, type: 'tool_call', ts: null, uuid: `av${seq}`, text: null,
    tool: { id: `tv${seq}`, name: 'Bash', category: 'bash', targets: [], command: 'verify', input: {} },
    result: null, warnings: [], raw: {} };
}

function mkVerifyResult(seq, ok, callUuid) {
  return { seq, type: 'tool_result', ts: null, uuid: `ur${seq}`, text: null, tool: null,
    result: { toolUseId: null, assistantUuid: callUuid, raw: {}, ok },
    warnings: [], raw: {} };
}

test('normal: edits / passing-verifies ratio computed', () => {
  const events = [
    mkEdit(0), mkEdit(1),
    mkVerifyCall(2),
    mkVerifyResult(3, true, 'av2'),
  ];
  const r = compute(events);
  assert.equal(r.raw.edits, 2);
  assert.equal(r.raw.verifiesOk, 1);
  assert.equal(r.status, 'ok');
  assert.ok(r.display.includes('2'));
});

test('degraded: zero successful verifies → ratio ∞, status=alert', () => {
  const events = [mkEdit(0), mkEdit(1)];
  const r = compute(events);
  assert.equal(r.raw.verifiesOk, 0);
  assert.equal(r.status, 'alert');
  assert.ok(r.display.includes('∞'));
});

test('degraded: failed verify (ok=false) not counted', () => {
  const events = [
    mkEdit(0),
    mkVerifyCall(1),
    mkVerifyResult(2, false, 'av1'),
  ];
  const r = compute(events);
  assert.equal(r.raw.verifiesOk, 0);
  assert.equal(r.status, 'alert');
});

test('no edits and no verifies → alert with note', () => {
  const r = compute([]);
  assert.equal(r.status, 'alert');
  assert.ok(r.raw.edits === 0);
});
