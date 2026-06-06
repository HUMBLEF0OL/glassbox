/**
 * test/integration.compare.test.js — compare command integration test (Slice 5).
 * Trace: BR-12, OBJ-3, AC-10, AC-11
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, existsSync, rmSync } from 'fs';
import { join, dirname } from 'path';
import { tmpdir } from 'os';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const BIN      = join(__dirname, '..', 'bin', 'glassbox.js');
const FIXTURES = join(__dirname, 'fixtures');

function run(...args) {
  return spawnSync(process.execPath, [BIN, ...args], { encoding: 'utf8' });
}

test('compare two fixtures produces one HTML report, exit 0', () => {
  const dir = mkdtempSync(join(tmpdir(), 'gb-cmp-'));
  const out = join(dir, 'compare.html');
  try {
    const result = run('compare',
      join(FIXTURES, 'real-sanitized.jsonl'),
      join(FIXTURES, 'no-verify.jsonl'),
      '--out', out
    );
    assert.equal(result.status, 0, `Expected exit 0\nstderr: ${result.stderr}`);
    assert.ok(existsSync(out), 'Compare report should be written');
    const html = readFileSync(out, 'utf8');
    assert.ok(html.startsWith('<!DOCTYPE html>'));
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('compare report contains all six metric labels', () => {
  const dir = mkdtempSync(join(tmpdir(), 'gb-cmp-metrics-'));
  const out = join(dir, 'compare.html');
  try {
    run('compare',
      join(FIXTURES, 'real-sanitized.jsonl'),
      join(FIXTURES, 'no-verify.jsonl'),
      '--out', out
    );
    const html = readFileSync(out, 'utf8');
    // All six metric labels must appear
    assert.ok(html.includes('Grep vs Semantic'));
    assert.ok(html.includes('Early Victory'));
    assert.ok(html.includes('Verification Density'));
    assert.ok(html.includes('Overreach'));
    assert.ok(html.includes('Continuity'));
    assert.ok(html.includes('Loop Detection'));
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('compare report has no external resource references (AC-11)', () => {
  const dir = mkdtempSync(join(tmpdir(), 'gb-cmp-ac11-'));
  const out = join(dir, 'compare.html');
  try {
    run('compare',
      join(FIXTURES, 'clean.jsonl'),
      join(FIXTURES, 'malformed.jsonl'),
      '--out', out
    );
    const html = readFileSync(out, 'utf8');
    assert.ok(!html.includes('http://'),  'No http:// links');
    assert.ok(!html.includes('https://'), 'No https:// links');
    assert.ok(!html.includes('//cdn'),    'No CDN refs');
    assert.ok(!/<link\s+rel=/i.test(html), 'No <link rel>');
    assert.ok(!html.includes('fetch('),   'No fetch()');
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('compare missing second argument → exit 1', () => {
  const result = run('compare', join(FIXTURES, 'clean.jsonl'));
  assert.equal(result.status, 1);
  assert.ok(result.stderr.includes('compare requires two'));
});
