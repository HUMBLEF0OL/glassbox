// Shared helpers for Glassbox harness hooks.
// Zero-dependency Node ESM. Hooks receive a JSON payload on stdin and signal
// decisions via exit code (0 = allow, 2 = block + feed stderr to Claude).
import process from 'node:process';

// Single source of truth for the no-network rule (NFR-01, AC-11, RSK-04).
// Matches forbidden module specifiers introduced via any import form:
//   require('http') · from 'https' · import('net') · import 'node:dns'
// (the bare side-effect import is the one the verify grep historically missed).
export const NETWORK =
  /(?:require\(|from\s+|import\s*\(|import\s+)['"](?:node:)?(?:https?|net|dns)\b/;

/** Tokenize the args of the first matching shell verb in each command segment. */
function lastTokenPerVerb(cmd, verbs) {
  const out = [];
  const text = String(cmd ?? '');
  const re = new RegExp(`\\b(?:${verbs})\\b([^;&|]*)`, 'gi');
  for (const m of text.matchAll(re)) {
    const toks = m[1].match(/(['"]?)([^\s'";|&<>]+)\1/g) || [];
    if (toks.length) out.push(toks[toks.length - 1].replace(/^['"]|['"]$/g, ''));
  }
  return out;
}

/** Redirection targets (`> file`, `>> file`, `N> file`, `tee [-a] file`) in a bash command. */
export function bashRedirectTargets(cmd) {
  const targets = new Set();
  const text = String(cmd ?? '');
  for (const m of text.matchAll(/(?:^|[\s;&|])\d*>>?\s*(['"]?)([^\s'";|&<>]+)\1/g)) targets.add(m[2]);
  for (const m of text.matchAll(/\btee\b\s+(?:-a\s+)?(['"]?)([^\s'";|&<>]+)\1/gi)) targets.add(m[2]);
  return [...targets];
}

/** Destination paths of copy/move-style commands (last arg of each cp/mv/etc.). */
export function bashCopyMoveTargets(cmd) {
  return lastTokenPerVerb(cmd, 'cp|mv|rsync|install|copy-item|move-item');
}

/** Read and parse the hook JSON payload from stdin. Never throws. */
export async function readHookInput() {
  const chunks = [];
  try {
    for await (const chunk of process.stdin) chunks.push(chunk);
  } catch {
    return {};
  }
  const raw = Buffer.concat(chunks).toString('utf8').trim();
  if (!raw) return {};
  try {
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

/** Normalize any path to forward slashes. */
export function toPosix(p) {
  return String(p ?? '').replace(/\\/g, '/');
}

/**
 * Express a file path relative to the session cwd (repo root), lower-cased,
 * with any leading "./" stripped. Returns "" when no path is given.
 */
export function relPath(file, cwd) {
  let f = toPosix(file);
  const c = toPosix(cwd ?? '').replace(/\/+$/, '');
  if (c && f.toLowerCase().startsWith(c.toLowerCase() + '/')) {
    f = f.slice(c.length + 1);
  }
  return f.replace(/^\.?\//, '');
}

/** True when `rel` lives inside one of the given top-level dirs. */
export function isUnderDir(rel, dirs) {
  const r = rel.toLowerCase();
  return dirs.some((d) => r === d.toLowerCase() || r.startsWith(d.toLowerCase() + '/'));
}

/** Block the tool call: print reason to stderr and exit 2. */
export function block(reason) {
  process.stderr.write(`[glassbox-harness] ${reason}\n`);
  process.exit(2);
}

/** Allow the tool call. */
export function allow() {
  process.exit(0);
}
