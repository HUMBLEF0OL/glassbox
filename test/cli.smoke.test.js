/**
 * test/cli.smoke.test.js — Phase 0 smoke tests (OBJ-4, NFR-02).
 * Verifies the CLI is runnable and responds to basic flags.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'url';
import { join, dirname } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const BIN = join(__dirname, '..', 'bin', 'glassbox.js');

function run(...args) {
  return spawnSync(process.execPath, [BIN, ...args], { encoding: 'utf8' });
}

test('--version exits 0 and prints a version string', () => {
  const { status, stdout } = run('--version');
  assert.equal(status, 0);
  assert.match(stdout, /glassbox v\d+\.\d+\.\d+/);
});

test('--help exits 0 and prints usage', () => {
  const { status, stdout } = run('--help');
  assert.equal(status, 0);
  assert.match(stdout, /Usage:/);
});

test('no args exits 0 and prints usage', () => {
  const { status, stdout } = run();
  assert.equal(status, 0);
  assert.match(stdout, /Usage:/);
});
