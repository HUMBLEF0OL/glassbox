/**
 * src/metrics/overreach.js — Overreach detection (BR-07/AC-06).
 * Reports distinct files changed per task; flags out-of-scope targets when --scope given.
 * Trace: BR-07, AC-06, NFR-06
 */
import { taskSegments } from './helpers.js';

/**
 * Convert a single glob segment (no rooting concerns) to a regex source string.
 * Supports * (any except /) and ** (any including /).
 * @param {string} pattern
 * @returns {string}
 */
function globToRegexSource(pattern) {
  return pattern
    .replace(/[.+^${}()|[\]\\]/g, '\\$&')  // escape regex specials (except * and ?)
    .replace(/\\\*/g, '*')                   // un-escape * for processing
    .replace(/\*\*/g, '\x00')               // temporarily replace **
    .replace(/\*/g, '[^/]*')               // * → match anything except /
    .replace(/\x00/g, '.*');               // ** → match anything
}

/**
 * .gitignore-style glob matcher without external dependencies.
 * extractTargets() records absolute paths, but users naturally write relative
 * scope globs ("src/**", "*.md"). Mirroring .gitignore semantics: a pattern
 * that is *rooted* (starts with "/", a drive letter "C:", or "**") must match
 * the full path; any other pattern is relative and matches at any depth.
 * @param {string} pattern
 * @param {string} filePath
 * @returns {boolean}
 */
function globMatch(pattern, filePath) {
  const path = filePath.replace(/\\/g, '/');
  const normalized = pattern.replace(/\\/g, '/');
  const isRooted = /^(?:\/|[A-Za-z]:|\*\*)/.test(normalized);
  const candidates = isRooted ? [normalized] : [normalized, `**/${normalized}`];
  return candidates.some(p => {
    try {
      return new RegExp(`^${globToRegexSource(p)}$`).test(path);
    } catch {
      return false;
    }
  });
}

/**
 * @param {import('../normalize.js').Event[]} events
 * @param {{ scope?: string[] }} options
 * @returns {import('./index.js').MetricResult}
 */
export function compute(events, options = {}) {
  const scope = options.scope ?? [];
  const segments = taskSegments(events);

  if (segments.length === 0) {
    return {
      id: 'overreach',
      label: 'Overreach',
      display: '0 tasks',
      explanation: 'No user tasks found.',
      status: 'ok',
      notes: null,
      raw: { tasks: [] },
    };
  }

  const tasks = segments.map(seg => {
    // All edit events within this segment's seq range
    const editEvents = events.filter(
      e => e.type === 'tool_call' &&
           e.tool?.category === 'edit' &&
           e.seq >= seg.start &&
           e.seq < seg.end
    );
    const allTargets = editEvents.flatMap(e => e.tool?.targets ?? []);
    const distinct   = [...new Set(allTargets)];

    let outOfScope = [];
    if (scope.length > 0) {
      outOfScope = distinct.filter(t => !scope.some(g => globMatch(g, t)));
    }

    return { userText: seg.userText, distinctFilesChanged: distinct.length, outOfScope };
  });

  // Session-level aggregate
  const allEdits    = events.filter(e => e.type === 'tool_call' && e.tool?.category === 'edit');
  const sessionFiles = [...new Set(allEdits.flatMap(e => e.tool?.targets ?? []))];
  const totalOutOfScope = scope.length > 0
    ? sessionFiles.filter(t => !scope.some(g => globMatch(g, t)))
    : [];

  const display = scope.length > 0
    ? `${sessionFiles.length} files (${totalOutOfScope.length} out-of-scope)`
    : `${sessionFiles.length} distinct files changed`;

  const status = totalOutOfScope.length > 0 ? 'alert' : 'ok';
  const notes = totalOutOfScope.length > 0
    ? `Out-of-scope: ${totalOutOfScope.slice(0, 5).join(', ')}${totalOutOfScope.length > 5 ? '…' : ''}`
    : null;

  return {
    id: 'overreach',
    label: 'Overreach',
    display,
    explanation: scope.length > 0
      ? `${sessionFiles.length} distinct files changed; ${totalOutOfScope.length} outside provided scope.`
      : `${sessionFiles.length} distinct files changed across ${tasks.length} task(s). Provide --scope to flag out-of-scope edits.`,
    status,
    notes,
    raw: { tasks, sessionFiles, totalOutOfScope },
  };
}
