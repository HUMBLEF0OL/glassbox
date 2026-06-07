/**
 * test/metrics.helpers.test.js — tests for src/metrics/helpers.js (Slice 3).
 * Trace: TSD §3.3, NFR-06
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { stableStringify, successOf, taskSegments, hasCompletionClaim } from '../src/metrics/helpers.js';

// --- stableStringify ---

test('stableStringify is key-order independent', () => {
  const a = stableStringify({ b: 1, a: 2 });
  const b = stableStringify({ a: 2, b: 1 });
  assert.equal(a, b);
});

test('stableStringify handles nested objects', () => {
  const result = stableStringify({ z: { y: 1, x: 2 } });
  assert.ok(result.indexOf('"x"') < result.indexOf('"y"'));
});

test('stableStringify handles arrays (order preserved)', () => {
  assert.equal(stableStringify([3, 1, 2]), '[3,1,2]');
});

test('stableStringify handles primitives', () => {
  assert.equal(stableStringify(42), '42');
  assert.equal(stableStringify('hi'), '"hi"');
  assert.equal(stableStringify(null), 'null');
});

// --- successOf ---

function makeResult(ok) {
  return { seq: 0, type: 'tool_result', ts: null, uuid: 'u1', text: null, tool: null,
    result: { toolUseId: null, assistantUuid: null, raw: {}, ok },
    warnings: [], raw: {} };
}

test('successOf returns true when ok=true', () => {
  assert.equal(successOf(makeResult(true)), true);
});

test('successOf returns false when ok=false', () => {
  assert.equal(successOf(makeResult(false)), false);
});

test('successOf returns null when ok=null', () => {
  assert.equal(successOf(makeResult(null)), null);
});

test('successOf returns null for non-tool_result event', () => {
  const ev = { seq: 0, type: 'user', ts: null, uuid: 'u1', text: 'hi', tool: null, result: null, warnings: [], raw: {} };
  assert.equal(successOf(ev), null);
});

test('successOf returns null for undefined input', () => {
  assert.equal(successOf(undefined), null);
});

// --- taskSegments ---

function mkEv(seq, type, text = null) {
  return { seq, type, ts: null, uuid: `e${seq}`, text, tool: null, result: null, warnings: [], raw: {} };
}

function mkTool(seq, category = 'edit', targets = []) {
  return { seq, type: 'tool_call', ts: null, uuid: `e${seq}`, text: null,
    tool: { id: `t${seq}`, name: 'Edit', category, targets, command: null, input: {} },
    result: null, warnings: [], raw: {} };
}

test('taskSegments splits at user messages', () => {
  const events = [
    mkEv(0, 'user', 'task 1'),
    mkEv(1, 'assistant', 'ok'),
    mkEv(2, 'user', 'task 2'),
    mkEv(3, 'assistant', 'done'),
  ];
  const segs = taskSegments(events);
  assert.equal(segs.length, 2);
  assert.equal(segs[0].userText, 'task 1');
  assert.equal(segs[0].start, 0);
  assert.equal(segs[0].end, 2);
  assert.equal(segs[1].userText, 'task 2');
  assert.equal(segs[1].start, 2);
});

test('taskSegments returns empty array for no events', () => {
  assert.deepEqual(taskSegments([]), []);
});

test('taskSegments single segment when one user message', () => {
  const events = [mkEv(0, 'user', 'go'), mkEv(1, 'assistant', 'ok')];
  const segs = taskSegments(events);
  assert.equal(segs.length, 1);
  assert.equal(segs[0].userText, 'go');
});

// --- hasCompletionClaim / COMPLETION_PATTERNS ---

const GENUINE_COMPLETION_CLAIMS = [
  'The implementation is complete.',
  'The implementation is complete and done.',
  'All tests pass. Implementation complete.',
  "I've implemented the fix and all tests pass.",
  'The fix is now complete and ready for review.',
  "I'm done with this task. Everything is committed.",
  'This is done — verified all tests pass locally.',
  "We're finished — this is ready to ship.",
];

const MID_TASK_NARRATION = [
  "I'm working on the authentication fix now.",
  "Once the migration is ready, we'll ship it to production.",
  'The tests are done running, let me check the output.',
  "I'll get this working and ship the build shortly.",
  "Let's make sure everything is set up correctly before we proceed.",
  "I'm ready to start implementing the feature.",
];

for (const text of GENUINE_COMPLETION_CLAIMS) {
  test(`hasCompletionClaim recognizes genuine completion claim: "${text}"`, () => {
    assert.equal(hasCompletionClaim([mkEv(0, 'assistant', text)]), true);
  });
}

for (const text of MID_TASK_NARRATION) {
  test(`hasCompletionClaim ignores mid-task narration: "${text}"`, () => {
    assert.equal(hasCompletionClaim([mkEv(0, 'assistant', text)]), false);
  });
}
