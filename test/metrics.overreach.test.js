/**
 * test/metrics.overreach.test.js (Slice 3, BR-07/AC-06)
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { compute } from '../src/metrics/overreach.js';

function mkEdit(seq, targets) {
  return { seq, type: 'tool_call', ts: null, uuid: `ae${seq}`, text: null,
    tool: { id: `t${seq}`, name: 'Edit', category: 'edit', targets, command: null, input: {} },
    result: null, warnings: [], raw: {} };
}

function mkUser(seq, text='task') {
  return { seq, type: 'user', ts: null, uuid: `u${seq}`, text,
    tool: null, result: null, warnings: [], raw: {} };
}

test('distinct file count without scope', () => {
  const events = [
    mkUser(0),
    mkEdit(1, ['/src/a.js']),
    mkEdit(2, ['/src/b.js']),
    mkEdit(3, ['/src/a.js']),  // duplicate — should count once
  ];
  const r = compute(events);
  assert.equal(r.raw.sessionFiles.length, 2);
  assert.equal(r.status, 'ok');
});

test('with --scope globs, out-of-scope targets flagged', () => {
  const events = [
    mkUser(0),
    mkEdit(1, ['/src/a.js']),
    mkEdit(2, ['/docs/readme.md']),  // outside scope
  ];
  const r = compute(events, { scope: ['/src/**'] });
  assert.equal(r.raw.totalOutOfScope.length, 1);
  assert.ok(r.raw.totalOutOfScope.includes('/docs/readme.md'));
  assert.equal(r.status, 'alert');
});

test('no out-of-scope when all in scope', () => {
  const events = [mkUser(0), mkEdit(1, ['/src/a.js'])];
  const r = compute(events, { scope: ['/src/**'] });
  assert.equal(r.raw.totalOutOfScope.length, 0);
  assert.equal(r.status, 'ok');
});

test('no tasks → display 0 tasks', () => {
  const r = compute([]);
  assert.ok(r.display.includes('0'));
});

test('per-task distinct file count', () => {
  const events = [
    mkUser(0, 'task 1'),
    mkEdit(1, ['/src/a.js']),
    mkEdit(2, ['/src/b.js']),
    mkUser(3, 'task 2'),
    mkEdit(4, ['/src/c.js']),
  ];
  const r = compute(events);
  assert.equal(r.raw.tasks.length, 2);
  assert.equal(r.raw.tasks[0].distinctFilesChanged, 2);
  assert.equal(r.raw.tasks[1].distinctFilesChanged, 1);
});
