/**
 * test/metrics.loopDetection.test.js (Slice 3, BR-09/AC-08)
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { compute } from '../src/metrics/loopDetection.js';

function mkTool(seq, name, input={}, category='bash') {
  return { seq, type: 'tool_call', ts: null, uuid: `a${seq}`, text: null,
    tool: { id: `t${seq}`, name, category, targets: [], command: null, input },
    result: null, warnings: [], raw: {} };
}

function mkEdit(seq, file) {
  return { seq, type: 'tool_call', ts: null, uuid: `a${seq}`, text: null,
    tool: { id: `t${seq}`, name: 'Edit', category: 'edit', targets: [file], command: null, input: { file_path: file } },
    result: null, warnings: [], raw: {} };
}

test('no loops → status=ok', () => {
  const events = [
    mkTool(0, 'Bash', { command: 'git status' }),
    mkTool(1, 'Bash', { command: 'git log' }),
  ];
  const r = compute(events, { threshold: 3 });
  assert.equal(r.status, 'ok');
  assert.equal(r.raw.repeatedCalls.length, 0);
});

test('tool call repeated ≥ threshold is flagged', () => {
  const events = [
    mkTool(0, 'Bash', { command: 'git status' }),
    mkTool(1, 'Bash', { command: 'git status' }),
    mkTool(2, 'Bash', { command: 'git status' }),
  ];
  const r = compute(events, { threshold: 3 });
  assert.equal(r.status, 'alert');
  assert.equal(r.raw.repeatedCalls.length, 1);
  assert.equal(r.raw.repeatedCalls[0].count, 3);
});

test('file edited ≥ threshold times is flagged', () => {
  const events = [
    mkEdit(0, '/foo.js'),
    mkEdit(1, '/foo.js'),
    mkEdit(2, '/foo.js'),
  ];
  const r = compute(events, { threshold: 3 });
  assert.equal(r.status, 'alert');
  assert.equal(r.raw.repeatedEdits.length, 1);
  assert.equal(r.raw.repeatedEdits[0].count, 3);
});

test('threshold 2: two identical calls → flagged', () => {
  const events = [
    mkTool(0, 'Read', { file_path: '/foo.js' }, 'read'),
    mkTool(1, 'Read', { file_path: '/foo.js' }, 'read'),
  ];
  const r = compute(events, { threshold: 2 });
  assert.equal(r.status, 'alert');
});

test('different inputs not flagged as loop', () => {
  const events = [
    mkTool(0, 'Bash', { command: 'git status' }),
    mkTool(1, 'Bash', { command: 'git log' }),
    mkTool(2, 'Bash', { command: 'git diff' }),
  ];
  const r = compute(events, { threshold: 3 });
  assert.equal(r.status, 'ok');
});

test('default threshold is 3', () => {
  const events = [
    mkTool(0, 'Bash', { command: 'x' }),
    mkTool(1, 'Bash', { command: 'x' }),
  ];
  const r = compute(events); // no threshold specified
  // 2 < default 3 → no loop
  assert.equal(r.status, 'ok');
});
