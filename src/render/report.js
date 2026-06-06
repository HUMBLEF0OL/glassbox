/**
 * src/render/report.js — single-session report assembly (Slice 2/3/4).
 * Produces a self-contained HTML string.
 *
 * Trace: BR-03, BR-10, BR-11, NFR-07, AC-02, AC-09, AC-11
 */
import { page, esc } from './template.js';

/**
 * Format an ISO timestamp into a short human-readable string.
 * @param {string|null} ts
 * @returns {string}
 */
function fmtTs(ts) {
  if (!ts) return '';
  try {
    return new Date(ts).toLocaleString(undefined, {
      month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit',
    });
  } catch {
    return ts;
  }
}

/**
 * Render a badge span.
 * @param {string} label
 * @param {string} cls
 * @returns {string}
 */
function badge(label, cls) {
  return `<span class="badge badge-${esc(cls)}">${esc(label)}</span>`;
}

/**
 * Render the timeline section as HTML.
 * @param {import('../timeline.js').Timeline} timeline
 * @returns {string}
 */
function renderTimeline(timeline) {
  if (timeline.entries.length === 0) {
    return '<p class="meta">No events to display.</p>';
  }

  const rows = timeline.entries.map(entry => {
    const tsStr = entry.ts ? `<span class="entry-ts">${esc(fmtTs(entry.ts))}</span>` : '';
    const badgeHtml = badge(entry.badge, entry.badge);
    const summaryHtml = entry.summary
      ? `<div class="entry-summary">${esc(entry.summary)}</div>`
      : '';
    return `<div class="entry kind-${esc(entry.kind)} badge-${esc(entry.badge)}">
  <div class="entry-header">
    <span class="entry-title">${esc(entry.title)}</span>
    ${badgeHtml}
    ${tsStr}
  </div>
  ${summaryHtml}
</div>`;
  }).join('\n');

  return `<div class="timeline">\n${rows}\n</div>`;
}

/**
 * Render a scorecard section.
 * In Slice 2 this is a placeholder — replaced in Slice 3.
 * In Slice 3+, scorecard is a real Scorecard object.
 *
 * @param {Object|null} scorecard - null → show placeholder
 * @returns {string}
 */
function renderScorecard(scorecard) {
  if (!scorecard || !Array.isArray(scorecard.metrics)) {
    return `<p class="meta"><em>Scorecard metrics will appear here after Slice 3 implementation.</em></p>`;
  }

  const cards = scorecard.metrics.map(m => {
    const status = m.status ?? 'unknown';
    const notes = m.notes ? `<div class="metric-notes">${esc(m.notes)}</div>` : '';
    return `<div class="metric-card status-${esc(status)}">
  <div class="metric-label">${esc(m.label)}</div>
  <div class="metric-display">${esc(String(m.display ?? '—'))}</div>
  <div class="metric-explanation">${esc(m.explanation ?? '')}</div>
  ${notes}
</div>`;
  }).join('\n');

  return `<div class="scorecard">\n${cards}\n</div>`;
}

/**
 * Assemble a full single-session HTML report.
 *
 * @param {{
 *   timeline: import('../timeline.js').Timeline,
 *   scorecard?: Object|null,
 *   meta: {
 *     file: string,
 *     generatedAt: string,
 *     eventCount: number,
 *     skipped: number,
 *     redacted?: number,
 *     sensitivityWarning?: boolean
 *   }
 * }} opts
 * @returns {string}
 */
export function report({ timeline, scorecard = null, meta }) {
  const title = `Glassbox — ${meta.file}`;

  // Sensitivity banner
  const bannerHtml = meta.sensitivityWarning
    ? `<div class="warning">⚠ This report may contain sensitive content from the transcript. Use --redact to scrub secrets.</div>`
    : (meta.redacted != null
        ? `<div class="info-banner">✓ ${meta.redacted} secret(s) redacted from this report.</div>`
        : '');

  const countsHtml = Object.entries(timeline.counts)
    .map(([k, v]) => `${k}: ${v}`)
    .join(' · ');

  const body = `
<h1>${esc(title)}</h1>
<div class="meta">
  Generated: ${esc(meta.generatedAt)} ·
  Events: ${esc(String(meta.eventCount))} ·
  Skipped: ${esc(String(meta.skipped))} ·
  ${esc(countsHtml)}
  ${meta.file ? ` · File: ${esc(meta.file)}` : ''}
</div>
${bannerHtml}

<h2>Timeline</h2>
${renderTimeline(timeline)}

<h2>Scorecard</h2>
${renderScorecard(scorecard)}
`;

  return page({ title, body });
}
