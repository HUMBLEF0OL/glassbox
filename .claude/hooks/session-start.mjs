// SessionStart hook. Prints the current harness state into the agent's context
// so every session begins by reading where the project stands — the
// continuity countermeasure (walkinglabs lecture-05; OBJ-5). stdout is added
// to the session context.
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { readHookInput } from './lib.mjs';

function currentSlice(root) {
  const p = join(root, 'PROGRESS.md');
  if (!existsSync(p)) return null;
  try {
    const lines = readFileSync(p, 'utf8').split('\n');
    // First slice-status table row that is in progress, else first not-started.
    const rows = lines.filter((l) => /^\|\s*\d/.test(l));
    const inProgress = rows.find((l) => /🟨|in progress/i.test(l));
    const notStarted = rows.find((l) => /⬜|not started/i.test(l));
    return (inProgress || notStarted || rows[0] || '').trim() || null;
  } catch {
    return null;
  }
}

function nextFeature(root) {
  const p = join(root, 'feature_list.json');
  if (!existsSync(p)) return null;
  try {
    const data = JSON.parse(readFileSync(p, 'utf8'));
    const features = Array.isArray(data) ? data : data.features ?? [];
    const open = features
      .filter((f) => f.status === 'in_progress' || f.status === 'not_started')
      .sort((a, b) => (a.priority ?? 99) - (b.priority ?? 99));
    const f = open.find((x) => x.status === 'in_progress') ?? open[0];
    return f ? `${f.id} — ${f.title} [${f.status}]` : null;
  } catch {
    return null;
  }
}

try {
  const payload = await readHookInput();
  const root = payload.cwd || process.cwd();

  const out = ['## Glassbox harness — session start'];
  const slice = currentSlice(root);
  if (slice) out.push(`- Current slice: ${slice}`);
  const feat = nextFeature(root);
  if (feat) out.push(`- Highest-priority feature: ${feat}`);
  out.push('- Verify gate: `pwsh ./verify.ps1` (Windows) / `./verify.sh` (POSIX) — must be green before merge.');
  out.push('- Read PROGRESS.md, feature_list.json, and .claude/rules.md before editing.');

  process.stdout.write(out.join('\n') + '\n');
} catch {
  /* never disrupt session start */
}
process.exit(0);
