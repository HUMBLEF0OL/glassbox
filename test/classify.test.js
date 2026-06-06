/**
 * test/classify.test.js — tests for src/classify.js (Slice 1).
 * Trace: TSD §4.2, RSK-01
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { annotate } from '../src/classify.js';

function makeToolCallEvent(name, input = {}) {
  return {
    seq: 0, type: 'tool_call', ts: null, uuid: 'a1', text: null,
    tool: { id: 'tu1', name, input, category: 'unknown', targets: [], command: null },
    result: null, warnings: [], raw: {},
  };
}

// --- Category resolution ---

test('Read → category=read', () => {
  const [ev] = annotate([makeToolCallEvent('Read', { file_path: '/src/foo.js' })]);
  assert.equal(ev.tool.category, 'read');
});

test('Write → category=edit', () => {
  const [ev] = annotate([makeToolCallEvent('Write')]);
  assert.equal(ev.tool.category, 'edit');
});

test('Edit → category=edit', () => {
  const [ev] = annotate([makeToolCallEvent('Edit')]);
  assert.equal(ev.tool.category, 'edit');
});

test('Glob → category=search', () => {
  const [ev] = annotate([makeToolCallEvent('Glob', { pattern: '**/*.js' })]);
  assert.equal(ev.tool.category, 'search');
});

test('Grep → category=search', () => {
  const [ev] = annotate([makeToolCallEvent('Grep', { pattern: 'foo' })]);
  assert.equal(ev.tool.category, 'search');
});

test('Bash → category=bash', () => {
  const [ev] = annotate([makeToolCallEvent('Bash', { command: 'ls -la' })]);
  assert.equal(ev.tool.category, 'bash');
});

test('PowerShell → category=bash', () => {
  const [ev] = annotate([makeToolCallEvent('PowerShell', { command: 'Get-Location' })]);
  assert.equal(ev.tool.category, 'bash');
});

test('TodoWrite → category=meta', () => {
  const [ev] = annotate([makeToolCallEvent('TodoWrite')]);
  assert.equal(ev.tool.category, 'meta');
});

test('ToolSearch → category=meta', () => {
  const [ev] = annotate([makeToolCallEvent('ToolSearch')]);
  assert.equal(ev.tool.category, 'meta');
});

test('unknown name → category=unknown', () => {
  const [ev] = annotate([makeToolCallEvent('FutureTool')]);
  assert.equal(ev.tool.category, 'unknown');
});

test('MCP filesystem prefix → category=read', () => {
  const [ev] = annotate([makeToolCallEvent('mcp__filesystem__read_file')]);
  assert.equal(ev.tool.category, 'read');
});

test('MCP git prefix → category=bash', () => {
  const [ev] = annotate([makeToolCallEvent('mcp__git__git_status')]);
  assert.equal(ev.tool.category, 'bash');
});

// --- Command classification ---

test('Bash command matching verify pattern → command=verify', () => {
  const [ev] = annotate([makeToolCallEvent('Bash', { command: 'node --test' })]);
  assert.equal(ev.tool.command, 'verify');
});

test('Bash command not matching verify pattern → command=other', () => {
  const [ev] = annotate([makeToolCallEvent('Bash', { command: 'ls -la' })]);
  assert.equal(ev.tool.command, 'other');
});

test('verify.ps1 → command=verify', () => {
  const [ev] = annotate([makeToolCallEvent('PowerShell', { command: 'pwsh ./verify.ps1' })]);
  assert.equal(ev.tool.command, 'verify');
});

test('non-bash tool → command=null', () => {
  const [ev] = annotate([makeToolCallEvent('Read', { file_path: '/foo.js' })]);
  assert.equal(ev.tool.command, null);
});

// --- Target extraction ---

test('file_path extracted as target', () => {
  const [ev] = annotate([makeToolCallEvent('Read', { file_path: '/src/foo.js' })]);
  assert.ok(ev.tool.targets.includes('/src/foo.js'));
});

test('Windows backslash paths normalized to POSIX', () => {
  const [ev] = annotate([makeToolCallEvent('Read', { file_path: 'C:\\Users\\test\\foo.js' })]);
  assert.ok(ev.tool.targets[0].includes('/'));
  assert.ok(!ev.tool.targets[0].includes('\\'));
});

test('targets[] array extracted', () => {
  const [ev] = annotate([makeToolCallEvent('MultiEdit', { targets: ['/a.js', '/b.js'] })]);
  assert.ok(ev.tool.targets.includes('/a.js'));
  assert.ok(ev.tool.targets.includes('/b.js'));
});

test('no input → empty targets array', () => {
  const [ev] = annotate([makeToolCallEvent('Bash', { command: 'ls' })]);
  assert.deepEqual(ev.tool.targets, []);
});

// --- Non-tool_call events are untouched ---

test('non-tool_call events pass through unchanged', () => {
  const ev = { seq: 0, type: 'user', ts: null, uuid: 'u1', text: 'hi', tool: null, result: null, warnings: [], raw: {} };
  const [out] = annotate([ev]);
  assert.equal(out, ev);
});
