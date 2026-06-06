/**
 * src/metrics/verificationDensity.js — Verification Density (BR-06/AC-05).
 * edits / successful-verifies ratio. Infinity + alert when no successful verifies.
 * Trace: BR-06, AC-05, NFR-06
 */
import { successOf, findCallForResult } from './helpers.js';

/**
 * @param {import('../normalize.js').Event[]} events
 * @param {Object} _options
 * @returns {import('./index.js').MetricResult}
 */
export function compute(events, _options = {}) {
  const edits = events.filter(e => e.type === 'tool_call' && e.tool?.category === 'edit').length;

  // Count tool_result events that follow a verify tool_call with ok===true
  const verifiesOk = events.filter(e => {
    if (e.type !== 'tool_result') return false;
    const call = findCallForResult(events, e);
    return call?.tool?.command === 'verify' && successOf(e) === true;
  }).length;

  if (verifiesOk === 0) {
    return {
      id: 'verificationDensity',
      label: 'Verification Density',
      display: `${edits} / 0 = ∞`,
      explanation: 'No successful verifications found. Every edit is unverified.',
      status: 'alert',
      notes: edits === 0 ? 'No edits and no verifications.' : null,
      raw: { edits, verifiesOk, ratio: null },
    };
  }

  const ratio = (edits / verifiesOk).toFixed(1);
  return {
    id: 'verificationDensity',
    label: 'Verification Density',
    display: `${edits} / ${verifiesOk} = ${ratio}`,
    explanation: `${ratio} edits per successful verify. Lower is better.`,
    status: 'ok',
    notes: null,
    raw: { edits, verifiesOk, ratio: parseFloat(ratio) },
  };
}
