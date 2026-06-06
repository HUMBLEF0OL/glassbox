/**
 * src/metrics/continuity.js — Continuity check (BR-08/AC-07).
 * Reports whether the state/progress file was read before the first edit.
 * Trace: BR-08, AC-07, NFR-06
 */
import { STATE_FILE_PATTERNS } from '../config.js';

/**
 * @param {import('../normalize.js').Event[]} events
 * @param {Object} _options
 * @returns {import('./index.js').MetricResult}
 */
export function compute(events, _options = {}) {
  const editEvents = events.filter(e => e.type === 'tool_call' && e.tool?.category === 'edit');
  if (editEvents.length === 0) {
    return {
      id: 'continuity',
      label: 'Continuity',
      display: 'n/a',
      explanation: 'No edits detected — continuity check not applicable.',
      status: 'ok',
      notes: 'No edits in this session.',
      raw: { stateRead: null, reason: 'no-edits' },
    };
  }

  const firstEditSeq = Math.min(...editEvents.map(e => e.seq));

  // Find a read tool_call targeting a state file before the first edit
  const stateRead = events.some(e =>
    e.type === 'tool_call' &&
    e.tool?.category === 'read' &&
    e.seq < firstEditSeq &&
    (e.tool?.targets ?? []).some(t => STATE_FILE_PATTERNS.some(re => re.test(t)))
  );

  if (stateRead) {
    return {
      id: 'continuity',
      label: 'Continuity',
      display: '✓ State read before edit',
      explanation: 'The state/progress file was read before the first edit.',
      status: 'ok',
      notes: null,
      raw: { stateRead: true, firstEditSeq },
    };
  }

  // Check if there are any read events at all (data availability)
  const anyReadEvents = events.some(e => e.type === 'tool_call' && e.tool?.category === 'read');
  if (!anyReadEvents) {
    return {
      id: 'continuity',
      label: 'Continuity',
      display: '?',
      explanation: 'No Read events in transcript — cannot determine continuity.',
      status: 'unknown',
      notes: 'No read events found; continuity cannot be verified.',
      raw: { stateRead: null, reason: 'no-read-events' },
    };
  }

  return {
    id: 'continuity',
    label: 'Continuity',
    display: '✗ State file not read before edit',
    explanation: 'No state/progress file was read before the first edit.',
    status: 'alert',
    notes: null,
    raw: { stateRead: false, firstEditSeq },
  };
}
