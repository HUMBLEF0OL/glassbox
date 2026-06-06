/**
 * src/render/compare.js — two-session side-by-side comparison report (Slice 5).
 * Reuses template.js for the HTML scaffold (AC-11).
 *
 * Trace: BR-12, OBJ-3, AC-10, AC-11
 */
import { page, esc } from './template.js';

/**
 * Compute a numeric delta between two metric display values.
 * Returns null if either value is non-numeric or can't be compared.
 * @param {string} displayA
 * @param {string} displayB
 * @returns {{ delta: number, direction: 'improvement'|'regression'|'neutral'|null }|null}
 */
function computeDelta(metricId, displayA, displayB) {
  // Extract the first number from each display string
  const numA = parseFloat(displayA);
  const numB = parseFloat(displayB);
  if (isNaN(numA) || isNaN(numB)) return null;
  const delta = numB - numA;
  if (delta === 0) return { delta: 0, direction: 'neutral' };

  // Metrics where lower is better
  const lowerIsBetter = new Set(['verificationDensity', 'overreach', 'loopDetection', 'earlyVictory', 'grepSemantic']);
  // For grepSemantic: lower search:semantic ratio is better (more semantic = better)
  const improvement = lowerIsBetter.has(metricId) ? delta < 0 : delta > 0;
  return { delta, direction: improvement ? 'improvement' : 'regression' };
}

/**
 * Render a direction badge.
 * @param {{delta: number, direction: string}|null} d
 * @returns {string}
 */
function deltaHtml(d) {
  if (!d) return '<span style="color:#57606a">—</span>';
  if (d.direction === 'improvement') return `<span style="color:#1a7f37">▲ +${d.delta.toFixed(1)} (better)</span>`;
  if (d.direction === 'regression')  return `<span style="color:#cf222e">▼ ${d.delta.toFixed(1)} (worse)</span>`;
  return `<span style="color:#57606a">= ${d.delta.toFixed(1)} (same)</span>`;
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
    const delta = computeDelta(mA.id, mA.display, mB.display);
    const statusA = mA.status ?? 'unknown';
    const statusB = mB.status ?? 'unknown';
    return `<tr>
  <td style="font-weight:600;padding:8px 12px">${esc(mA.label)}</td>
  <td style="padding:8px 12px" class="status-cell-${esc(statusA)}">${esc(mA.display)}</td>
  <td style="padding:8px 12px" class="status-cell-${esc(statusB)}">${esc(mB.display)}</td>
  <td style="padding:8px 12px">${deltaHtml(delta)}</td>
</tr>`;
  }).join('\n');

  // Build summary stats
  function sessionSummary(s) {
    const entries = s.timeline?.entries ?? [];
    return `Events: ${esc(String(s.meta?.eventCount ?? '?'))} · Skipped: ${esc(String(s.meta?.skipped ?? '?'))} · File: ${esc(s.meta?.file ?? '?')}`;
  }

  const body = `
<h1>${esc(title)}</h1>
<div class="meta">Generated: ${esc(meta.generatedAt)}</div>

<h2>Scorecard Comparison</h2>
<table style="width:100%;border-collapse:collapse;background:#fff;border:1px solid #d0d7de;border-radius:6px;overflow:hidden">
  <thead>
    <tr style="background:#f6f8fa">
      <th style="text-align:left;padding:8px 12px">Metric</th>
      <th style="text-align:left;padding:8px 12px">Session A</th>
      <th style="text-align:left;padding:8px 12px">Session B</th>
      <th style="text-align:left;padding:8px 12px">Delta (A→B)</th>
    </tr>
  </thead>
  <tbody>
${rows}
  </tbody>
</table>

<div style="margin-top:16px;display:grid;grid-template-columns:1fr 1fr;gap:16px">
  <div style="background:#fff;border:1px solid #d0d7de;border-radius:6px;padding:12px">
    <h2 style="margin-bottom:8px">Session A</h2>
    <div class="meta">${sessionSummary(a)}</div>
  </div>
  <div style="background:#fff;border:1px solid #d0d7de;border-radius:6px;padding:12px">
    <h2 style="margin-bottom:8px">Session B</h2>
    <div class="meta">${sessionSummary(b)}</div>
  </div>
</div>
`;

  return page({ title, body });
}
