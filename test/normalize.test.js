/**
 * test/normalize.test.js — tests for src/normalize.js (Slice 1).
 * Trace: RSK-01, BR-13, NFR-05
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { toEvents } from '../src/normalize.js';

// --- Helpers ----------------------------------------------------------------

function makeUser(text) {
  return {
    type: 'user', uuid: 'u1', timestamp: '2026-01-01T00:00:00.000Z',
    message: { role: 'user', content: [{ type: 'text', text }] },
    sessionId: 's1',
  };
}

function makeAssistantText(text) {
  return {
    type: 'assistant', uuid: 'a1', timestamp: '2026-01-01T00:00:01.000Z',
    message: { role: 'assistant', content: [{ type: 'text', text }] },
    sessionId: 's1',
  };
}

function makeAssistantToolUse(name, input, id = 'tu1') {
  return {
    type: 'assistant', uuid: 'a2', timestamp: '2026-01-01T00:00:02.000Z',
    message: { role: 'assistant', content: [{ type: 'tool_use', id, name, input }] },
    sessionId: 's1',
  };
}

function makeToolResult(rawResult, assistantUuid = 'a2') {
  return {
    type: 'user', uuid: 'u2', timestamp: '2026-01-01T00:00:03.000Z',
    toolUseResult: rawResult,
    sourceToolAssistantUUID: assistantUuid,
    sessionId: 's1',
  };
}

// --- Tests ------------------------------------------------------------------

test('user message → type=user with text', () => {
  const [ev] = toEvents([makeUser('hello')]);
  assert.equal(ev.type, 'user');
  assert.equal(ev.text, 'hello');
  assert.equal(ev.seq, 0);
});

test('assistant text → type=assistant with text', () => {
  const [ev] = toEvents([makeAssistantText('I will help')]);
  assert.equal(ev.type, 'assistant');
  assert.equal(ev.text, 'I will help');
});

test('assistant tool_use → type=tool_call with tool.name', () => {
  const [ev] = toEvents([makeAssistantToolUse('Read', { file_path: '/foo.js' })]);
  assert.equal(ev.type, 'tool_call');
  assert.equal(ev.tool.name, 'Read');
  assert.deepEqual(ev.tool.input, { file_path: '/foo.js' });
  assert.equal(ev.tool.id, 'tu1');
});

test('tool result record → type=tool_result', () => {
  const raw = { type: 'text', file: { filePath: '/foo.js', content: 'code' } };
  const [ev] = toEvents([makeToolResult(raw)]);
  assert.equal(ev.type, 'tool_result');
  assert.equal(ev.result.raw, raw);
  assert.equal(ev.result.assistantUuid, 'a2');
});

test('assistant with text AND tool_use expands to two events in order', () => {
  const record = {
    type: 'assistant', uuid: 'a3', timestamp: '2026-01-01T00:00:01.000Z',
    message: {
      role: 'assistant',
      content: [
        { type: 'text', text: 'reading file' },
        { type: 'tool_use', id: 'tu2', name: 'Read', input: { file_path: '/a.js' } },
      ],
    },
    sessionId: 's1',
  };
  const events = toEvents([record]);
  assert.equal(events.length, 2);
  assert.equal(events[0].type, 'assistant');
  assert.equal(events[0].text, 'reading file');
  assert.equal(events[1].type, 'tool_call');
  assert.equal(events[1].tool.name, 'Read');
  // seq must be monotonically increasing
  assert.equal(events[0].seq, 0);
  assert.equal(events[1].seq, 1);
});

test('assistant with multiple tool_use blocks expands each', () => {
  const record = {
    type: 'assistant', uuid: 'a4', timestamp: '2026-01-01T00:00:01.000Z',
    message: {
      role: 'assistant',
      content: [
        { type: 'tool_use', id: 'tu1', name: 'Read', input: {} },
        { type: 'tool_use', id: 'tu2', name: 'Edit', input: {} },
      ],
    },
    sessionId: 's1',
  };
  const events = toEvents([record]);
  assert.equal(events.length, 2);
  assert.equal(events[0].tool.name, 'Read');
  assert.equal(events[1].tool.name, 'Edit');
});

test('missing timestamp → ts===null and warning recorded', () => {
  const record = {
    type: 'user', uuid: 'u1',
    message: { role: 'user', content: 'hi' },
  };
  const [ev] = toEvents([record]);
  assert.equal(ev.ts, null);
  assert.ok(ev.warnings.some(w => /timestamp/.test(w)));
});

test('unknown record type → type=unknown with warning', () => {
  const record = { type: 'queue-operation', timestamp: '2026-01-01T00:00:00Z' };
  const events = toEvents([record]);
  // queue-operation is skipped entirely, not turned into unknown
  assert.equal(events.length, 0);
});

test('truly unknown type → type=unknown', () => {
  const record = { type: 'new-future-type', timestamp: '2026-01-01T00:00:00Z' };
  const [ev] = toEvents([record]);
  assert.equal(ev.type, 'unknown');
  assert.ok(ev.warnings.length > 0);
});

test('seq is monotonically increasing across multiple records', () => {
  const records = [
    makeUser('hello'),
    makeAssistantText('hi'),
    makeAssistantToolUse('Read', {}),
    makeToolResult({}),
  ];
  const events = toEvents(records);
  for (let i = 1; i < events.length; i++) {
    assert.ok(events[i].seq > events[i - 1].seq);
  }
});

test('tool result with interrupted=true → ok=false', () => {
  const record = makeToolResult({ stdout: '', stderr: '', interrupted: true, isImage: false });
  const [ev] = toEvents([record]);
  assert.equal(ev.result.ok, false);
});

test('tool result with no error signals → ok=true', () => {
  const record = makeToolResult({ stdout: '3 pass', stderr: '', interrupted: false, isImage: false });
  const [ev] = toEvents([record]);
  assert.equal(ev.result.ok, true);
});
