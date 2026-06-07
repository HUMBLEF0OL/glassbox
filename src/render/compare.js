/**
 * src/render/compare.js — two-session side-by-side comparison report (Slice 5).
 * Reuses template.js for the HTML scaffold and shared dark-theme classes (AC-11).
 *
 * Trace: BR-12, OBJ-3, AC-10, AC-11
 */
import { page, esc } from './template.js';

/**
 * Extract the single number that actually represents a metric's comparable
 * value from its `raw` data — NOT from the display string, whose leading
 * number is often a count/numerator rather than the ratio it summarizes
 * (e.g. display "10 / 60 = 6.0" must compare 1.0 → 6.0, not 10 → 60).
 * Returns null when the metric has no well-defined numeric value to compare
 * (e.g. earlyVictory/continuity, whose raw values are booleans).
 * @param {import('./report.js').MetricResult} metric
 * @returns {number|null}
 */
export function comparableValue(metric) {
  const raw = metric?.raw;
  if (!raw || typeof raw !== 'object') return null;
  switch (metric.id) {
    case 'verificationDensity':
      return typeof raw.ratio === 'number' && !isNaN(raw.ratio) ? raw.ratio : null;
    case 'grepSemantic': {
      const r = typeof raw.ratio === 'string' ? parseFloat(raw.ratio) : raw.ratio;
      return typeof r === 'number' && !isNaN(r) ? r : null;
    }
    case 'overreach':
      return Array.isArray(raw.sessionFiles) ? raw.sessionFiles.length : null;
    case 'loopDetection':
      return Array.isArray(raw.repeatedCalls) && Array.isArray(raw.repeatedEdits)
        ? raw.repeatedCalls.length + raw.repeatedEdits.length
        : null;
    default:
      return null;
  }
}

/**
 * Compute a numeric delta between two metrics' comparable raw values.
 * Returns null if either side has no well-defined comparable value.
 * @param {import('./report.js').MetricResult} metricA
 * @param {import('./report.js').MetricResult} metricB
 * @returns {{ delta: number, direction: 'improvement'|'regression'|'neutral' }|null}
 */
export function computeDelta(metricA, metricB) {
  const numA = comparableValue(metricA);
  const numB = comparableValue(metricB);
  if (numA === null || numB === null) return null;
  const delta = numB - numA;
  if (delta === 0) return { delta: 0, direction: 'neutral' };

  // Metrics where a lower comparable value indicates healthier behaviour
  const lowerIsBetter = new Set(['verificationDensity', 'overreach', 'loopDetection', 'grepSemantic']);
  const improvement = lowerIsBetter.has(metricA.id) ? delta < 0 : delta > 0;
  return { delta, direction: improvement ? 'improvement' : 'regression' };
}

/**
 * Render a direction badge.
 * @param {{delta: number, direction: string}|null} d
 * @returns {string}
 */
function deltaHtml(d) {
  if (!d) return '<span class="delta-neutral">—</span>';
  if (d.direction === 'improvement') return `<span class="delta-improve">▲ +${d.delta.toFixed(1)} (better)</span>`;
  if (d.direction === 'regression')  return `<span class="delta-regress">▼ ${d.delta.toFixed(1)} (worse)</span>`;
  return `<span class="delta-neutral">= ${d.delta.toFixed(1)} (same)</span>`;
}

/**
 * Assemble a two-session comparison HTML report.
 *
 * @param {{
 *   a: { timeline: Object, scorecard: Object, meta: Object },
 *   b: { timeline: Object, scorecard: Object, meta: Object },
 *   meta: { generatedAt: string }
 * }} opts
 * @returns {string}
 */
export function compare({ a, b, meta }) {
  const title = 'Glassbox — Session Comparison';

  // Build metric comparison table
  const metricsA = a.scorecard?.metrics ?? [];
  const metricsB = b.scorecard?.metrics ?? [];

  const rows = metricsA.map((mA, i) => {
    const mB = metricsB[i] ?? { label: mA.label, display: '—', status: 'unknown', explanation: '' };
    const delta = computeDelta(mA, mB);
    const statusA = mA.status ?? 'unknown';
    const statusB = mB.status ?? 'unknown';
    return `<tr>
  <td style="font-weight:600">${esc(mA.label)}</td>
  <td class="status-cell-${esc(statusA)}">${esc(mA.display)}</td>
  <td class="status-cell-${esc(statusB)}">${esc(mB.display)}</td>
  <td>${deltaHtml(delta)}</td>
</tr>`;
  }).join('\n');

  // Build summary stats
  function sessionSummary(s) {
    return `Events: ${esc(String(s.meta?.eventCount ?? '?'))} · Skipped: ${esc(String(s.meta?.skipped ?? '?'))} · File: ${esc(s.meta?.file ?? '?')}`;
  }

  const nav = `<nav id="topnav">
  <div class="nav-brand">&#9643; <em>Glass</em>box</div>
  <div class="nav-links">
    <a href="#comparison">Comparison</a>
    <a href="#sessions">Sessions</a>
  </div>
  <div class="nav-summary">Session A vs Session B</div>
</nav>`;

  const body = `
<div class="page-header">
  <div class="page-title">${esc(title)}</div>
  <div class="page-meta">Generated ${esc(meta.generatedAt)}</div>
</div>

<section id="comparison">
  <h2 class="section-title"><span class="icon">⇄</span> Scorecard Comparison</h2>
  <div class="cmp-table-wrap">
    <table class="compare-table">
      <thead>
        <tr>
          <th>Metric</th>
          <th>Session A</th>
          <th>Session B</th>
          <th>Delta (A→B)</th>
        </tr>
      </thead>
      <tbody>
${rows}
      </tbody>
    </table>
  </div>
</section>

<section id="sessions">
  <h2 class="section-title"><span class="icon">◎</span> Sessions</h2>
  <div class="compare-session-grid">
    <div class="compare-card">
      <h3>Session A</h3>
      <div class="meta">${sessionSummary(a)}</div>
    </div>
    <div class="compare-card">
      <h3>Session B</h3>
      <div class="meta">${sessionSummary(b)}</div>
    </div>
  </div>
</section>
`;

  return page({ title, body, nav });
}
