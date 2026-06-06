/**
 * src/metrics/earlyVictory.js — Early Victory detection (BR-05/AC-04).
 * Raised when: completion is claimed AND no successful verify follows the last edit.
 * Trace: BR-05, AC-04, NFR-06
 */
import { successOf, hasCompletionClaim } from './helpers.js';

/**
 * @param {import('../normalize.js').Event[]} events
 * @param {Object} _options
 * @returns {import('./index.js').MetricResult}
 */
export function compute(events, _options = {}) {
  // Last edit seq
  const editEvents = events.filter(e => e.type === 'tool_call' && e.tool?.category === 'edit');
  if (editEvents.length === 0) {
    return {
      id: 'earlyVictory',
      label: 'Early Victory',
      display: 'n/a',
      explanation: 'No edits detected in this session.',
      status: 'ok',
      notes: 'No edits — metric not applicable.',
      raw: { raised: false, reason: 'no-edits' },
    };
  }

  const lastEditSeq = Math.max(...editEvents.map(e => e.seq));

  // Check for completion claim in assistant text
  const claimed = hasCompletionClaim(events);
  if (!claimed) {
    return {
      id: 'earlyVictory',
      label: 'Early Victory',
      display: 'Not raised',
      explanation: 'No completion claim detected.',
      status: 'ok',
      notes: null,
      raw: { raised: false, reason: 'no-claim' },
    };
  }

  // Check for a successful verify result after the last edit
  const postEditVerifies = events.filter(
    e => e.type === 'tool_result' && e.seq > lastEditSeq
  );

  const hasPassingVerify = postEditVerifies.some(e => {
    // Find the corresponding tool_call to check if it was a verify command
    const call = events.find(c => c.type === 'tool_call' && c.uuid === e.result?.assistantUuid);
    const isVerify = call?.tool?.command === 'verify';
    const ok = successOf(e);
    return isVerify && ok === true;
  });

  if (hasPassingVerify) {
    return {
      id: 'earlyVictory',
      label: 'Early Victory',
      display: 'Not raised',
      explanation: 'Completion claimed with a passing verification afterward.',
      status: 'ok',
      notes: null,
      raw: { raised: false, reason: 'verify-ok' },
    };
  }

  // Check if verify success is undeterminable (null ok)
  const anyVerifyAttempted = postEditVerifies.some(e => {
    const call = events.find(c => c.type === 'tool_call' && c.uuid === e.result?.assistantUuid);
    return call?.tool?.command === 'verify';
  });

  if (anyVerifyAttempted) {
    return {
      id: 'earlyVictory',
      label: 'Early Victory',
      display: '?',
      explanation: 'Completion claimed; verify attempted but success undeterminable.',
      status: 'unknown',
      notes: 'Could not determine verify pass/fail from available data.',
      raw: { raised: null, reason: 'undeterminable' },
    };
  }

  return {
    id: 'earlyVictory',
    label: 'Early Victory',
    display: 'RAISED',
    explanation: 'Completion claimed without a subsequent passing verification.',
    status: 'alert',
    notes: null,
    raw: { raised: true, lastEditSeq },
  };
}
