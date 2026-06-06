// PreToolUse guard (Write|Edit|MultiEdit|Bash).
// Prevents raw Claude Code transcripts from landing in the repo. Only
// sanitized JSONL fixtures under test/fixtures/ are permitted. Enforces the
// "never commit raw transcripts" privacy rule (RSK-04, rules.md).
import {
  readHookInput,
  relPath,
  isUnderDir,
  block,
  allow,
  bashRedirectTargets,
  bashCopyMoveTargets,
} from './lib.mjs';

try {
  const payload = await readHookInput();
  const input = payload.tool_input ?? {};
  const tool = payload.tool_name ?? '';

  // Bash path: block writing a .jsonl into the repo outside test/fixtures via a
  // redirection (`> x.jsonl`) or a copy/move destination (`cp a.jsonl ./x.jsonl`).
  // Reading raw transcripts (the tool's whole job) is never blocked.
  if (tool === 'Bash') {
    const cmd = typeof input.command === 'string' ? input.command : '';
    const dests = [...bashRedirectTargets(cmd), ...bashCopyMoveTargets(cmd)].filter((t) =>
      /\.jsonl$/i.test(t),
    );
    const offending = dests
      .map((t) => relPath(t, payload.cwd))
      .find((r) => !r.startsWith('..') && !r.includes(':/') && !isUnderDir(r, ['test/fixtures']));
    if (offending) {
      block(
        `Blocked: this command writes a .jsonl transcript at ${offending}. Only sanitized ` +
          `fixtures under test/fixtures/ may be committed — raw transcripts must never enter the ` +
          `repo (RSK-04). Sanitize the structure and place it under test/fixtures/.`,
      );
    }
    allow();
  }

  const file = input.file_path ?? input.path ?? '';
  const rel = relPath(file, payload.cwd);

  const isJsonl = /\.jsonl$/i.test(rel);
  if (!isJsonl) allow();

  if (!isUnderDir(rel, ['test/fixtures'])) {
    block(
      `Blocked: writing a .jsonl transcript at ${rel}. Only sanitized fixtures under ` +
        `test/fixtures/ may be committed — raw transcripts must never enter the repo (RSK-04). ` +
        `Sanitize the structure and place it under test/fixtures/.`,
    );
  }
  allow();
} catch {
  allow();
}
