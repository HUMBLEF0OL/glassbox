/**
 * src/classify.js — annotate tool_call events with category, targets, command (Slice 1).
 * Works on the normalized Event[] — never reads raw transcript fields directly.
 *
 * Trace: TSD §4.2, RSK-01, BR-01
 */
import { CLASSIFICATION, VERIFY_PATTERNS } from './config.js';

/**
 * Strip MCP namespace prefix from a tool name (e.g. "mcp__filesystem__read_file" → "read_file").
 * @param {string} name
 * @returns {string}
 */
function stripMcpPrefix(name) {
  return name.replace(/^mcp__[^_]+__/, '');
}

/**
 * Resolve a tool name to a category.
 * Order: exact match → prefix pattern → unknown.
 * @param {string} rawName
 * @returns {string}
 */
function resolveCategory(rawName) {
  if (!rawName) return 'unknown';

  // 1. Exact match
  if (Object.prototype.hasOwnProperty.call(CLASSIFICATION.exact, rawName)) {
    return CLASSIFICATION.exact[rawName];
  }

  // 2. Prefix patterns (before stripping, to catch full MCP names)
  for (const { re, category } of CLASSIFICATION.prefixPatterns) {
    if (re.test(rawName)) return category;
  }

  // 3. Retry exact after stripping MCP prefix
  const stripped = stripMcpPrefix(rawName);
  if (stripped !== rawName) {
    if (Object.prototype.hasOwnProperty.call(CLASSIFICATION.exact, stripped)) {
      return CLASSIFICATION.exact[stripped];
    }
  }

  return 'unknown';
}

/**
 * Normalize a file path to POSIX separators.
 * @param {string} p
 * @returns {string}
 */
function toPosix(p) {
  return p.replace(/\\/g, '/');
}

/**
 * Extract file/path targets from a tool input object.
 * Checks: file_path, filePath, path, targets[], files[], and any *path / *Path key.
 * @param {Object} input
 * @returns {string[]}
 */
function extractTargets(input) {
  if (!input || typeof input !== 'object') return [];

  const targets = new Set();

  // Known direct target fields
  for (const key of ['file_path', 'filePath', 'path']) {
    if (typeof input[key] === 'string') targets.add(toPosix(input[key]));
  }

  // Array fields
  for (const key of ['targets', 'files', 'paths']) {
    if (Array.isArray(input[key])) {
      input[key].forEach(p => typeof p === 'string' && targets.add(toPosix(p)));
    }
  }

  // Generic *path / *Path keys (case-insensitive)
  for (const [key, val] of Object.entries(input)) {
    if (/path$/i.test(key) && typeof val === 'string' && !targets.has(toPosix(val))) {
      targets.add(toPosix(val));
    }
  }

  return [...targets];
}

/**
 * Determine whether a shell command is a verify/test run.
 * @param {string} cmd
 * @returns {'verify'|'other'}
 */
function classifyCommand(cmd) {
  if (!cmd || typeof cmd !== 'string') return 'other';
  return VERIFY_PATTERNS.some(re => re.test(cmd)) ? 'verify' : 'other';
}

/**
 * Annotate all tool_call events in-place with category, targets, and command.
 * Returns the same array for convenience.
 *
 * @param {import('./normalize.js').Event[]} events
 * @returns {import('./normalize.js').Event[]}
 */
export function annotate(events) {
  for (const ev of events) {
    if (ev.type !== 'tool_call' || !ev.tool) continue;

    const tool = ev.tool;
    tool.category = resolveCategory(tool.name);
    tool.targets  = extractTargets(tool.input);

    // For shell runners, classify the command
    if (tool.category === 'bash') {
      const cmd = tool.input?.command ?? tool.input?.cmd ?? '';
      tool.command = classifyCommand(cmd);
    } else {
      tool.command = null;
    }
  }
  return events;
}
