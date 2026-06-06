// PostToolUse observer. Appends a compact, append-only record of every tool
// call to .claude/logs/tool-use.jsonl so a session's actions are observable
// and debuggable (walkinglabs lecture-11; OBJ-5). Never blocks; never throws.
import { existsSync, mkdirSync, appendFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { readHookInput } from './lib.mjs';

function summarize(name, input) {
  if (!input || typeof input !== 'object') return null;
  if (typeof input.command === 'string') return input.command.slice(0, 200);
  const f = input.file_path ?? input.path;
  if (typeof f === 'string') return f;
  if (typeof input.pattern === 'string') return input.pattern.slice(0, 120);
  return null;
}

try {
  const payload = await readHookInput();
  const root = payload.cwd || process.cwd();
  const logFile = join(root, '.claude', 'logs', 'tool-use.jsonl');

  const record = {
    ts: new Date().toISOString(),
    session: payload.session_id ?? null,
    tool: payload.tool_name ?? 'unknown',
    summary: summarize(payload.tool_name, payload.tool_input),
  };

  if (!existsSync(dirname(logFile))) mkdirSync(dirname(logFile), { recursive: true });
  appendFileSync(logFile, JSON.stringify(record) + '\n');
} catch {
  /* observability must never disrupt the session */
}
process.exit(0);
