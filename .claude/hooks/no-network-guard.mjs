// PreToolUse guard (Write|Edit|MultiEdit|Bash).
// Rejects any edit that would introduce a forbidden network import
// (http/https/net/dns) into src/ or bin/. Enforces NFR-01, AC-11, RSK-04 at
// authoring time, before the verify gate has to catch it.
import {
  readHookInput,
  relPath,
  isUnderDir,
  block,
  allow,
  NETWORK,
  bashRedirectTargets,
} from './lib.mjs';

function collectNewText(input) {
  if (!input || typeof input !== 'object') return '';
  const parts = [];
  if (typeof input.content === 'string') parts.push(input.content);
  if (typeof input.new_string === 'string') parts.push(input.new_string);
  if (Array.isArray(input.edits)) {
    for (const e of input.edits) {
      if (e && typeof e.new_string === 'string') parts.push(e.new_string);
    }
  }
  return parts.join('\n');
}

try {
  const payload = await readHookInput();
  const input = payload.tool_input ?? {};
  const tool = payload.tool_name ?? '';

  // Bash path: block if the command writes a forbidden import into src/ or bin/
  // via a shell redirection (e.g. `echo "import 'node:http'" >> src/x.js`).
  if (tool === 'Bash') {
    const cmd = typeof input.command === 'string' ? input.command : '';
    if (NETWORK.test(cmd)) {
      const hits = bashRedirectTargets(cmd)
        .map((t) => relPath(t, payload.cwd))
        .filter((r) => /\.(?:js|mjs|cjs)$/i.test(r) && isUnderDir(r, ['src', 'bin']));
      if (hits.length) {
        block(
          `Blocked: this command writes a forbidden network import (http/https/net/dns) into ` +
            `${hits.join(', ')}. Glassbox is no-network by rule (NFR-01, AC-11, RSK-04).`,
        );
      }
    }
    allow();
  }

  const file = input.file_path ?? input.path ?? '';
  const rel = relPath(file, payload.cwd);

  // Only guard the product code; tests and harness scripts are exempt.
  const isJs = /\.(?:js|mjs|cjs)$/i.test(rel);
  if (!isJs || !isUnderDir(rel, ['src', 'bin'])) allow();

  const text = collectNewText(input);
  if (NETWORK.test(text)) {
    block(
      `Blocked: this edit adds a forbidden network import (http/https/net/dns) to ${rel}. ` +
        `Glassbox is no-network by rule (NFR-01, AC-11, RSK-04). Remove it before writing.`,
    );
  }
  allow();
} catch {
  // Fail open: the verify gate remains the authoritative backstop.
  allow();
}
