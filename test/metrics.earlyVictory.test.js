/**
 * test/metrics.earlyVictory.test.js (Slice 3, BR-05/AC-04)
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { compute } from '../src/metrics/earlyVictory.js';

function mkEdit(seq, file='/src/foo.js') {
  return { seq, type: 'tool_call', ts: null, uuid: `ae${seq}`, text: null,
    tool: { id: `t${seq}`, name: 'Edit', category: 'edit', targets: [file], command: null, input: {} },
    result: null, warnings: [], raw: {} };
}

function mkVerifyCall(seq) {
  return { seq, type: 'tool_call', ts: null, uuid: `av${seq}`, text: null,
    tool: { id: `t${seq}`, name: 'Bash', category: 'bash', targets: [], command: 'verify', input: { command: 'node --test' } },
    result: null, warnings: [], raw: {} };
}

function mkVerifyResult(seq, ok, callUuid) {
  return { seq, type: 'tool_result', ts: null, uuid: `ur${seq}`, text: null, tool: null,
    result: { toolUseId: null, assistantUuid: callUuid, raw: {}, ok },
    warnings: [], raw: {} };
}

function mkAssistantText(seq, text) {
  return { seq, type: 'assistant', ts: null, uuid: `a${seq}`, text,
    tool: null, result: null, warnings: [], raw: {} };
}

test('not raised when no edits', () => {
  const events = [mkAssistantText(0, 'The implementation is complete.')];
  const r = compute(events);
  assert.equal(r.raw.raised, false);
  assert.equal(r.status, 'ok');
});

test('not raised when no completion claim', () => {
  const events = [mkEdit(0), mkVerifyResult(1, true, 'av0')];
  const r = compute(events);
  assert.equal(r.raw.raised, false);
});

test('raised when claim made without post-edit passing verify', () => {
  const events = [
    mkEdit(0),
    mkAssistantText(1, 'The implementation is complete and done.'),
  ];
  const r = compute(events);
  assert.equal(r.raw.raised, true);
  assert.equal(r.status, 'alert');
});

test('not raised when claim + passing verify exists after last edit', () => {
  const events = [
    mkEdit(0),
    mkAssistantText(1, 'The implementation is complete.'),
    mkVerifyCall(2),
    mkVerifyResult(3, true, 'av2'),
  ];
  const r = compute(events);
  assert.equal(r.raw.raised, false);
  assert.equal(r.status, 'ok');
});

test('unknown when verify attempted but ok=null', () => {
  const events = [
    mkEdit(0),
    mkAssistantText(1, 'All tests pass. Implementation complete.'),
    mkVerifyCall(2),
    mkVerifyResult(3, null, 'av2'),
  ];
  const r = compute(events);
  assert.equal(r.status, 'unknown');
});
