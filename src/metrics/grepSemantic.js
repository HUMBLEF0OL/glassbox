/**
 * src/metrics/grepSemantic.js — Grep vs Semantic ratio (BR-04/AC-03).
 * Trace: BR-04, AC-03, NFR-06, ASM-04, RSK-03
 */

/**
 * @param {import('../normalize.js').Event[]} events
 * @param {Object} _options
 * @returns {import('./index.js').MetricResult}
 */
export function compute(events, _options = {}) {
  const searchCount   = events.filter(e => e.type === 'tool_call' && e.tool?.category === 'search').length;
  const semanticCount = events.filter(e => e.type === 'tool_call' && e.tool?.category === 'semantic').length;
  const total = searchCount + semanticCount;

  // Degraded path: no semantic tools observed (ASM-04/RSK-03)
  if (semanticCount === 0) {
    return {
      id: 'grepSemantic',
      label: 'Grep vs Semantic',
      display: `${searchCount} searches, 0 semantic`,
      explanation: 'Text search tools only — no LSP/semantic navigation observed.',
      status: 'unknown',
      notes: total === 0
        ? 'No search or semantic tool calls found.'
        : 'No semantic tools observed on this machine; ratio is unavailable (ASM-04).',
      raw: { searchCount, semanticCount },
    };
  }

  const ratio = semanticCount > 0 ? (searchCount / semanticCount).toFixed(1) : '∞';
  return {
    id: 'grepSemantic',
    label: 'Grep vs Semantic',
    display: `${searchCount} : ${semanticCount}`,
    explanation: `Search-to-semantic ratio ${ratio}. Lower is better (more semantic nav).`,
    status: 'ok',
    notes: null,
    raw: { searchCount, semanticCount, ratio },
  };
}
