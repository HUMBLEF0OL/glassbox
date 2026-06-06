/**
 * src/discover.js — OS-aware transcript location (Slice 1).
 * Exports resolveTranscript() to find a .jsonl file on disk.
 *
 * Trace: BR-01, CON-02, ASM-01, NFR-02
 */
import { existsSync, readdirSync, statSync } from 'fs';
import { join } from 'path';
import { homedir, platform } from 'os';

/**
 * Platform candidate root directories for Claude Code transcripts.
 * These are searched when --latest is used.
 * Real path confirmed: ~/.claude/projects/<project-slug>/*.jsonl
 *
 * @returns {string[]}
 */
function candidateRoots() {
  const home = homedir();
  const roots = [
    join(home, '.claude', 'projects'),
  ];
  if (platform() === 'win32') {
    const appData = process.env.APPDATA || join(home, 'AppData', 'Roaming');
    roots.push(
      join(appData, 'Claude', 'projects'),
      join(home, '.config', 'claude', 'projects'),
    );
  } else {
    roots.push(
      join(home, '.config', 'claude', 'projects'),
      process.env.XDG_CONFIG_HOME
        ? join(process.env.XDG_CONFIG_HOME, 'claude', 'projects')
        : null,
    );
  }
  return roots.filter(Boolean);
}

/**
 * Recursively collect all *.jsonl files under a directory, non-throwing.
 * @param {string} dir
 * @returns {string[]}
 */
function collectJsonl(dir) {
  const results = [];
  try {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const full = join(dir, entry.name);
      if (entry.isDirectory()) {
        results.push(...collectJsonl(full));
      } else if (entry.isFile() && entry.name.endsWith('.jsonl')) {
        results.push(full);
      }
    }
  } catch {
    // missing / no-permission root — skip silently (CON-02)
  }
  return results;
}

/**
 * @typedef {Object} TranscriptLocation
 * @property {string}   file             - Absolute path to the .jsonl file
 * @property {'arg'|'latest'} source     - How the file was resolved
 * @property {string[]} candidatesTried  - Roots that were searched (empty for 'arg')
 */

/**
 * Resolve a transcript file path.
 *
 * @param {{ path?: string, latest?: boolean }} opts
 * @returns {TranscriptLocation}
 * @throws {Error} when the explicit path does not exist or no file is found via --latest
 */
export function resolveTranscript({ path, latest } = {}) {
  if (path) {
    if (!existsSync(path)) {
      throw new Error(`Transcript not found: ${path}`);
    }
    return { file: path, source: 'arg', candidatesTried: [] };
  }

  if (latest) {
    const roots = candidateRoots();
    const candidatesTried = roots.filter(r => existsSync(r));
    const allFiles = roots.flatMap(collectJsonl);

    if (allFiles.length === 0) {
      throw new Error(
        `No .jsonl transcripts found. Searched: ${roots.join(', ')}`
      );
    }

    // Return the newest by mtime
    const newest = allFiles.reduce((best, f) => {
      try {
        const mt = statSync(f).mtimeMs;
        return mt > best.mt ? { file: f, mt } : best;
      } catch {
        return best;
      }
    }, { file: allFiles[0], mt: 0 });

    return { file: newest.file, source: 'latest', candidatesTried };
  }

  throw new Error('Provide a transcript path or use --latest.');
}
