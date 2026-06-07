/**
 * src/render/report.js — single-session report assembly (Slice 2/3/4/UI redesign).
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
 * Derive a 0–1 fill ratio for a metric's progress ring from its display string.
 * Recognizes "NN%" and "a / b" forms; falls back to a status-based fill so
 * count-style metrics still render a meaningful ring.
 * @param {string|number|null} display
 * @param {string} status
 * @returns {number}
 */
function ringPct(display, status) {
  const s = String(display ?? '');
  const pct = s.match(/^(\d+(?:\.\d+)?)\s*%/);
  if (pct) return Math.min(parseFloat(pct[1]) / 100, 1);
  const ratio = s.match(/^(\d+)\s*\/\s*(\d+)/);
  if (ratio) {
    const den = parseFloat(ratio[2]);
    return den > 0 ? Math.min(parseFloat(ratio[1]) / den, 1) : 0;
  }
  if (status === 'ok') return 1;
  if (status === 'alert') return 0.25;
  return 0.5;
}

/**
 * Derive a short glyph (≤4 chars) to center inside the progress ring. The ring
 * is a compact visual indicator, not a text container — long display strings
 * are rendered separately as the card's headline value (see renderScorecard),
 * so the ring only ever needs to hold a percentage, a short ratio, or a
 * status glyph.
 * @param {string|number|null} display
 * @param {string} status
 * @returns {string}
 */
function ringGlyph(display, status) {
  const s = String(display ?? '');
  const pct = s.match(/^(\d+(?:\.\d+)?)\s*%/);
  if (pct) return `${pct[1]}%`;
  const ratio = s.match(/^(\d+)\s*[/:]\s*(\d+)\s*$/);
  if (ratio) return `${ratio[1]}/${ratio[2]}`;
  if (status === 'ok') return '✓';
  if (status === 'alert') return '✗';
  return '–';
}

/**
 * Render an SVG circular progress ring with a short glyph centered — the
 * full metric value is shown as headline text alongside it (see renderScorecard).
 * @param {string|number|null} display
 * @param {string} status
 * @returns {string}
 */
function renderProgressRing(display, status) {
  const r = 30;
  const circ = 2 * Math.PI * r;
  const offset = circ * (1 - ringPct(display, status));
  const cls = status === 'ok' ? 'ok' : status === 'alert' ? 'alert' : 'unknown';
  return `<div class="ring-wrap">
  <svg viewBox="0 0 80 80" width="80" height="80">
    <circle class="ring-track" cx="40" cy="40" r="${r}"/>
    <circle class="ring-fill ${esc(cls)}" cx="40" cy="40" r="${r}"
      stroke-dasharray="${circ.toFixed(2)}"
      stroke-dashoffset="${offset.toFixed(2)}"
      transform="rotate(-90 40 40)"/>
  </svg>
  <div class="ring-text">${esc(ringGlyph(display, status))}</div>
</div>`;
}

/**
 * Render the scorecard section as a grid of metric cards: each pairs a compact
 * progress ring (visual status at a glance) with the metric's full display
 * value as headline text — so long phrases stay readable instead of being
 * crammed inside the ring graphic.
 * @param {Object|null} scorecard - null → show placeholder (pre-Slice-3 callers)
 * @returns {string}
 */
function renderScorecard(scorecard) {
  if (!scorecard || !Array.isArray(scorecard.metrics)) {
    return `<p style="color:var(--text-muted);font-style:italic">Scorecard metrics will appear here after Slice 3 implementation.</p>`;
  }

  const cards = scorecard.metrics.map(m => {
    const status = m.status ?? 'unknown';
    const notes = m.notes ? `<div class="metric-notes">${esc(m.notes)}</div>` : '';
    return `<div class="metric-card status-${esc(status)}">
  ${renderProgressRing(m.display, status)}
  <div class="metric-value">${esc(String(m.display ?? '—'))}</div>
  <div class="metric-label">${esc(m.label)}</div>
  <div class="metric-explanation">${esc(m.explanation ?? '')}</div>
  ${notes}
</div>`;
  }).join('\n');

  return `<div class="scorecard">${cards}</div>`;
}

/**
 * Render a single timeline entry row.
 * @param {import('../timeline.js').TimelineEntry} entry
 * @returns {string}
 */
function renderEntry(entry) {
  const tsStr = entry.ts ? `<span class="entry-ts">${esc(fmtTs(entry.ts))}</span>` : '';
  const summaryHtml = entry.summary
    ? `<div class="entry-summary">${esc(entry.summary)}</div>`
    : '';
  return `<div class="entry kind-${esc(entry.kind)} badge-${esc(entry.badge)}">
  <div class="entry-dot"></div>
  <div class="entry-body">
    <div class="entry-header">
      <span class="entry-title">${esc(entry.title)}</span>
      ${badge(entry.badge, entry.badge)}
      ${tsStr}
    </div>
    ${summaryHtml}
  </div>
</div>`;
}

/**
 * Render the timeline grouped by conversation turn: each user message opens a
 * collapsible group containing the tool calls / results / assistant replies
 * that followed, until the next user message. Entries that precede the first
 * user message (e.g. system events) are rendered standalone.
 * @param {import('../timeline.js').Timeline} timeline
 * @returns {string}
 */
function renderTimeline(timeline) {
  if (timeline.entries.length === 0) {
    return '<p style="color:var(--text-muted);font-style:italic">No events to display.</p>';
  }

  const turns = [];
  let current = null;
  for (const entry of timeline.entries) {
    if (entry.kind === 'user') {
      current = { userEntry: entry, children: [] };
      turns.push(current);
    } else if (current) {
      current.children.push(entry);
    } else {
      turns.push({ standalone: entry });
    }
  }

  const rows = turns.map((turn, idx) => {
    if (turn.standalone) return renderEntry(turn.standalone);

    const { userEntry, children } = turn;
    const tsStr = userEntry.ts ? `<span class="turn-ts">${esc(fmtTs(userEntry.ts))}</span>` : '';
    const countStr = children.length
      ? `<span class="turn-count">${children.length} item${children.length !== 1 ? 's' : ''}</span>`
      : '';
    const msg = userEntry.summary || userEntry.title;
    return `<div class="turn-group" id="turn-${idx + 1}">
  <div class="turn-header">
    <span class="turn-arrow">▼</span>
    <span class="turn-label">Turn ${idx + 1}</span>
    <span class="turn-user-msg">${esc(msg)}</span>
    ${tsStr}
    ${countStr}
  </div>
  <div class="turn-body">${children.map(renderEntry).join('')}</div>
</div>`;
  }).join('\n');

  return `<div class="timeline">${rows}</div>`;
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

  const bannerHtml = meta.sensitivityWarning
    ? `<div class="banner banner-warn">⚠ This report may contain sensitive content from the transcript. Use --redact to scrub secrets.</div>`
    : (meta.redacted != null
        ? `<div class="banner banner-info">✓ ${meta.redacted} secret(s) redacted from this report.</div>`
        : '');

  const fileParts = String(meta.file ?? '').replace(/\\/g, '/').split('/');
  const shortFile = fileParts.slice(-2).join('/');
  const eventDate = meta.generatedAt
    ? new Date(meta.generatedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
    : '';

  const nav = `<nav id="topnav">
  <div class="nav-brand">&#9643; <em>Glass</em>box</div>
  <div class="nav-links">
    <a href="#scorecard">Scorecard</a>
    <a href="#timeline">Timeline</a>
    <a href="#info">Info</a>
  </div>
  <div class="nav-summary">${esc(String(meta.eventCount))} events · ${esc(eventDate)}</div>
</nav>`;

  const body = `
<div class="page-header">
  <div class="page-title">Session Report</div>
  <div class="page-file">${esc(shortFile)}</div>
  <div class="page-meta">Generated ${esc(meta.generatedAt)} · ${esc(String(meta.eventCount))} events · ${esc(String(meta.skipped))} skipped</div>
</div>
${bannerHtml}

<section id="scorecard">
  <h2 class="section-title"><span class="icon">◈</span> Scorecard</h2>
  ${renderScorecard(scorecard)}
</section>

<section id="timeline">
  <h2 class="section-title"><span class="icon">◷</span> Timeline</h2>
  ${renderTimeline(timeline)}
</section>

<section id="info">
  <h2 class="section-title"><span class="icon">◎</span> Session Info</h2>
  <div class="info-grid">
    <span class="info-key">File</span><span class="info-val">${esc(meta.file)}</span>
    <span class="info-key">Generated</span><span class="info-val">${esc(meta.generatedAt)}</span>
    <span class="info-key">Events</span><span class="info-val">${esc(String(meta.eventCount))}</span>
    <span class="info-key">Skipped</span><span class="info-val">${esc(String(meta.skipped))}</span>
    ${meta.redacted != null ? `<span class="info-key">Redacted</span><span class="info-val" style="color:var(--yellow)">${esc(String(meta.redacted))} secret(s)</span>` : ''}
  </div>
</section>
`;

  return page({ title, body, nav });
}
