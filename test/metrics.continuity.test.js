/**
 * test/metrics.continuity.test.js (Slice 3, BR-08/AC-07)
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { compute } from '../src/metrics/continuity.js';

function mkRead(seq, targets) {
  return { seq, type: 'tool_call', ts: null, uuid: `ar${seq}`, text: null,
    tool: { id: `t${seq}`, name: 'Read', category: 'read', targets, command: null, input: {} },
    result: null, warnings: [], raw: {} };
}

function mkEdit(seq) {
  return { seq, type: 'tool_call', ts: null, uuid: `ae${seq}`, text: null,
    tool: { id: `t${seq}`, name: 'Edit', category: 'edit', targets: ['/src/foo.js'], command: null, input: {} },
    result: null, warnings: [], raw: {} };
}

test('state file read before edit → status=ok, stateRead=true', () => {
  const events = [
    mkRead(0, ['/PROGRESS.md']),
    mkEdit(1),
  ];
  const r = compute(events);
  assert.equal(r.raw.stateRead, true);
  assert.equal(r.status, 'ok');
});

test('no state file read before edit → status=alert', () => {
  const events = [
    mkRead(0, ['/src/cli.js']),
    mkEdit(1),
  ];
  const r = compute(events);
  assert.equal(r.raw.stateRead, false);
  assert.equal(r.status, 'alert');
});

test('no edits → n/a, status=ok', () => {
  const events = [mkRead(0, ['/PROGRESS.md'])];
  const r = compute(events);
  assert.equal(r.raw.stateRead, null);
  assert.equal(r.status, 'ok');
});

test('no read events at all → unknown', () => {
  const events = [mkEdit(0)];
  const r = compute(events);
  assert.equal(r.status, 'unknown');
});

test('state file read AFTER first edit → still alert', () => {
  const events = [
    mkEdit(0),
    mkRead(1, ['/PROGRESS.md']),
  ];
  const r = compute(events);
  assert.equal(r.raw.stateRead, false);
  assert.equal(r.status, 'alert');
});
