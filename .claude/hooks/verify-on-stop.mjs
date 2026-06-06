// Stop guard. Runs the verify gate when the agent tries to end its turn and
// blocks completion if it fails — the harness countermeasure to "declaring
// victory too early" (walkinglabs lecture-09; OBJ-5).
//
// Safe by construction:
//  - honours `stop_hook_active` so it can never loop forever;
//  - skips quietly before Slice 0 exists (no package.json / no test files);
//  - any internal error fails open.
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { readHookInput, NETWORK } from './lib.mjs';

function hasTestFiles(root) {
  const dir = join(root, 'test');
  if (!existsSync(dir)) return false;
  const stack = [dir];
  while (stack.length) {
    const cur = stack.pop();
    let entries;
    try {
      entries = readdirSync(cur, { withFileTypes: true });
    } catch {
      continue;
    }
    for (const e of entries) {
      const p = join(cur, e.name);
      if (e.isDirectory()) stack.push(p);
      else if (/\.test\.(?:js|mjs)$/i.test(e.name)) return true;
    }
  }
  return false;
}

function networkViolations(root) {
  const hits = [];
  for (const top of ['src', 'bin']) {
    const dir = join(root, top);
    if (!existsSync(dir)) continue;
    const stack = [dir];
    while (stack.length) {
      const cur = stack.pop();
      let entries;
      try {
        entries = readdirSync(cur, { withFileTypes: true });
      } catch {
        continue;
      }
      for (const e of entries) {
        const p = join(cur, e.name);
        if (e.isDirectory()) stack.push(p);
        else if (/\.(?:js|mjs|cjs)$/i.test(e.name)) {
          try {
            if (NETWORK.test(readFileSync(p, 'utf8'))) hits.push(p);
          } catch {
            /* ignore unreadable */
          }
        }
      }
    }
  }
  return hits;
}

try {
  const payload = await readHookInput();
  const root = payload.cwd || process.cwd();

  // Never re-trigger ourselves into a loop.
  if (payload.stop_hook_active) process.exit(0);

  // Pre-Slice-0: nothing to verify yet.
  if (!existsSync(join(root, 'package.json')) || !hasTestFiles(root)) {
    process.stderr.write('[glassbox-harness] verify skipped (no tests yet).\n');
    process.exit(0);
  }

  const test = spawnSync(process.execPath, ['--test'], {
    cwd: root,
    encoding: 'utf8',
  });
  const testFailed = test.status !== 0;

  // Inline no-network check (avoids depending on a shell).
  const offenders = networkViolations(root);

  if (testFailed || offenders.length) {
    const lines = ['Verify gate is RED — do not stop yet.'];
    if (testFailed) lines.push('• node --test failed. Fix the failing tests.');
    if (offenders.length)
      lines.push(`• Forbidden network import(s) in: ${offenders.join(', ')}`);
    lines.push('Run verify.ps1 / verify.sh, get it green, then finish.');
    process.stderr.write('[glassbox-harness] ' + lines.join('\n') + '\n');
    process.exit(2);
  }

  process.exit(0);
} catch {
  // Fail open: verify.* remains the authoritative gate.
  process.exit(0);
}
