/**
 * src/metrics/helpers.js — shared metric utilities (Slice 3).
 * Trace: TSD §3.3, NFR-06
 */
import { COMPLETION_PATTERNS } from '../config.js';

/**
 * Deterministic key-sorted JSON serialization.
 * Used for stable hashing in loop detection.
 * @param {*} obj
 * @returns {string}
 */
export function stableStringify(obj) {
  if (obj === null || obj === undefined) return JSON.stringify(obj);
  if (typeof obj !== 'object') return JSON.stringify(obj);
  if (Array.isArray(obj)) {
    return '[' + obj.map(stableStringify).join(',') + ']';
  }
  const keys = Object.keys(obj).sort();
  const pairs = keys.map(k => JSON.stringify(k) + ':' + stableStringify(obj[k]));
  return '{' + pairs.join(',') + '}';
}

/**
 * Derive success signal from a tool_result event.
 * Returns true (pass), false (fail), or null (undeterminable).
 * Trace: Open Question 4
 *
 * @param {import('../normalize.js').Event} resultEvent
 * @returns {boolean|null}
 */
export function successOf(resultEvent) {
  if (!resultEvent || resultEvent.type !== 'tool_result') return null;
  const ok = resultEvent.result?.ok;
  if (typeof ok === 'boolean') return ok;
  return null;
}

/**
 * Split an Event array into task segments at user-message boundaries.
 * Each segment spans from a user message (inclusive) to just before the next user message.
 *
 * @param {import('../normalize.js').Event[]} events
 * @returns {Array<{start: number, end: number, userText: string|null}>}
 *   start/end are seq values (inclusive/exclusive)
 */
export function taskSegments(events) {
  const segments = [];
  let segStart = null;
  let userText = null;

  for (let i = 0; i < events.length; i++) {
    const ev = events[i];
    if (ev.type === 'user') {
      // Real user message (tool results are type 'tool_result', not 'user')
      if (segStart !== null) {
        segments.push({ start: segStart, end: ev.seq, userText });
      }
      segStart  = ev.seq;
      userText  = ev.text;
    }
  }

  // Close the last segment
  if (segStart !== null) {
    const last = events[events.length - 1];
    segments.push({ start: segStart, end: (last?.seq ?? segStart) + 1, userText });
  }

  return segments;
}

/**
 * Find the tool_call event that produced a given tool_result event.
 *
 * Prefers the precise block-level link (`tool.id === result.toolUseId`, assigned by
 * normalize.correlateResults) so that an assistant turn emitting several tool calls is
 * disambiguated correctly. Falls back to the assistant-record uuid when no toolUseId is
 * present (e.g. hand-built test events that bypass normalization).
 *
 * @param {import('../normalize.js').Event[]} events
 * @param {import('../normalize.js').Event} resultEvent
 * @returns {import('../normalize.js').Event|undefined}
 */
export function findCallForResult(events, resultEvent) {
  const toolUseId = resultEvent?.result?.toolUseId;
  if (toolUseId != null) {
    const byId = events.find(
      c => c.type === 'tool_call' && c.tool?.id != null && c.tool.id === toolUseId
    );
    if (byId) return byId;
  }
  const assistantUuid = resultEvent?.result?.assistantUuid;
  if (assistantUuid == null) return undefined;
  return events.find(c => c.type === 'tool_call' && c.uuid === assistantUuid);
}

/**
 * Check if any assistant text event matches completion claim patterns.
 * @param {import('../normalize.js').Event[]} events
 * @returns {boolean}
 */
export function hasCompletionClaim(events) {
  return events.some(ev =>
    ev.type === 'assistant' &&
    typeof ev.text === 'string' &&
    COMPLETION_PATTERNS.some(re => re.test(ev.text))
  );
}
