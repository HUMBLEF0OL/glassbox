/**
 * src/metrics/index.js — Metrics REGISTRY and runAll() (Slice 3).
 * Each module exports compute(events, options) → MetricResult.
 * runAll always returns all six in fixed order.
 *
 * Trace: TSD §3.3, NFR-06, BR-04..BR-09
 */
import { compute as grepSemantic }        from './grepSemantic.js';
import { compute as earlyVictory }        from './earlyVictory.js';
import { compute as verificationDensity } from './verificationDensity.js';
import { compute as overreach }           from './overreach.js';
import { compute as continuity }          from './continuity.js';
import { compute as loopDetection }       from './loopDetection.js';

/**
 * @typedef {Object} MetricResult
 * @property {string}      id           - Unique metric identifier
 * @property {string}      label        - Human-readable name
 * @property {string}      display      - Short display value
 * @property {string}      explanation  - One-sentence explanation
 * @property {'ok'|'alert'|'unknown'} status
 * @property {string|null} notes        - Additional context or warning
 * @property {Object}      raw          - Raw computation data for debugging
 */

/**
 * @typedef {Object} Scorecard
 * @property {MetricResult[]} metrics
 */

/** Fixed-order registry — order determines scorecard display order. */
export const REGISTRY = [
  { id: 'grepSemantic',        compute: grepSemantic },
  { id: 'earlyVictory',        compute: earlyVictory },
  { id: 'verificationDensity', compute: verificationDensity },
  { id: 'overreach',           compute: overreach },
  { id: 'continuity',          compute: continuity },
  { id: 'loopDetection',       compute: loopDetection },
];

/**
 * Run all metrics and return a Scorecard.
 * Each metric is called independently; an error in one does not affect others.
 *
 * @param {import('../normalize.js').Event[]} events
 * @param {{ scope?: string[], threshold?: number }} [options]
 * @returns {Scorecard}
 */
export function runAll(events, options = {}) {
  const metrics = REGISTRY.map(({ id, compute }) => {
    try {
      return compute(events, options);
    } catch (err) {
      return {
        id,
        label: id,
        display: 'error',
        explanation: 'Metric computation failed.',
        status: 'unknown',
        notes: `Internal error: ${err.message}`,
        raw: { error: err.message },
      };
    }
  });
  return { metrics };
}
