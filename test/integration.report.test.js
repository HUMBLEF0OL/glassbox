/**
 * test/integration.report.test.js — full pipeline integration test (Slice 2).
 * Trace: AC-02, AC-09, AC-11, NFR-04
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

test('full pipeline over real-sanitized.jsonl exits 0 and writes HTML', () => {
  const dir  = mkdtempSync(join(tmpdir(), 'gb-report-'));
  const out  = join(dir, 'report.html');
  try {
    const result = run(join(FIXTURES, 'real-sanitized.jsonl'), '--out', out);
    assert.equal(result.status, 0, `Expected exit 0, got ${result.status}\nstderr: ${result.stderr}`);
    assert.ok(existsSync(out), 'Report file should be written');
    const html = readFileSync(out, 'utf8');
    assert.ok(html.startsWith('<!DOCTYPE html>'), 'Output should be an HTML document');
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('generated HTML contains timeline entries', () => {
  const dir = mkdtempSync(join(tmpdir(), 'gb-timeline-'));
  const out = join(dir, 'report.html');
  try {
    run(join(FIXTURES, 'real-sanitized.jsonl'), '--out', out);
    const html = readFileSync(out, 'utf8');
    assert.ok(html.includes('timeline'), 'HTML should contain timeline section');
    // At least one timeline entry (user/assistant/tool_call)
    assert.ok(html.includes('entry kind-'), 'HTML should contain entry divs');
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('HTML contains no external resource references (AC-11)', () => {
  const dir = mkdtempSync(join(tmpdir(), 'gb-ac11-'));
  const out = join(dir, 'report.html');
  try {
    run(join(FIXTURES, 'real-sanitized.jsonl'), '--out', out);
    const html = readFileSync(out, 'utf8');
    assert.ok(!html.includes('http://'),  'No http:// links');
    assert.ok(!html.includes('https://'), 'No https:// links');
    assert.ok(!html.includes('//cdn'),    'No CDN references');
    assert.ok(!/<link\s+rel=/i.test(html), 'No <link rel= tags');
    assert.ok(!html.includes('fetch('),   'No fetch() calls');
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('full pipeline over clean.jsonl produces valid HTML', () => {
  const dir = mkdtempSync(join(tmpdir(), 'gb-clean-'));
  const out = join(dir, 'report.html');
  try {
    const result = run(join(FIXTURES, 'clean.jsonl'), '--out', out);
    assert.equal(result.status, 0);
    const html = readFileSync(out, 'utf8');
    assert.ok(html.length > 0);
    assert.ok(html.includes('</html>'));
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
