/**
 * src/redact.js — optional secret scrubbing (Slice 4).
 * Replaces matched secrets with «redacted:‹kind›» and returns a count.
 * Never throws; non-string inputs are passed through unchanged.
 *
 * Trace: NFR-01, RSK-04, AC-11
 */
import { SECRET_PATTERNS } from './config.js';

/**
 * Scrub a single string against all (or provided) secret patterns.
 * @param {string} text
 * @param {Array<{kind: string, re: RegExp}>} [patterns]
 * @returns {{ text: string, count: number }}
 */
export function scrub(text, patterns = SECRET_PATTERNS) {
  if (typeof text !== 'string') return { text, count: 0 };

  let count = 0;
  let result = text;

  for (const { kind, re } of patterns) {
    // Reset lastIndex to avoid sticky state bugs with global regexes
    re.lastIndex = 0;
    result = result.replace(re, () => {
      count++;
      return `«redacted:${kind}»`;
    });
    re.lastIndex = 0;
  }

  return { text: result, count };
}

/**
 * Recursively scrub all string values in an object/array.
 * @param {*} value
 * @param {Array<{kind: string, re: RegExp}>} patterns
 * @returns {{ value: *, count: number }}
 */
function scrubValue(value, patterns) {
  if (typeof value === 'string') {
    const { text, count } = scrub(value, patterns);
    return { value: text, count };
  }
  if (Array.isArray(value)) {
    let total = 0;
    const arr = value.map(item => {
      const { value: v, count } = scrubValue(item, patterns);
      total += count;
      return v;
    });
    return { value: arr, count: total };
  }
  if (value && typeof value === 'object') {
    let total = 0;
    const obj = {};
    for (const [k, v] of Object.entries(value)) {
      const { value: sv, count } = scrubValue(v, patterns);
      obj[k] = sv;
      total += count;
    }
    return { value: obj, count: total };
  }
  return { value, count: 0 };
}

/**
 * Walk all rendered string fields in the timeline and scorecard,
 * scrubbing secrets when --redact is active.
 *
 * @param {{
 *   timeline: import('./timeline.js').Timeline,
 *   scorecard: import('./metrics/index.js').Scorecard|null
 * }} model
 * @param {{ redact?: boolean }} opts
 * @returns {{
 *   timeline: import('./timeline.js').Timeline,
 *   scorecard: import('./metrics/index.js').Scorecard|null,
 *   count: number
 * }}
 */
export function scrubModel({ timeline, scorecard }, opts = {}) {
  if (!opts.redact) return { timeline, scorecard, count: 0 };

  const patterns = SECRET_PATTERNS;
  let total = 0;

  // Scrub timeline entry summaries and titles
  const scrubbedEntries = timeline.entries.map(entry => {
    const { value: summary, count: c1 } = scrubValue(entry.summary, patterns);
    const { value: title,   count: c2 } = scrubValue(entry.title,   patterns);
    total += c1 + c2;
    return { ...entry, summary, title };
  });

  // Scrub scorecard metric display / notes
  let scrubbedScorecard = scorecard;
  if (scorecard?.metrics) {
    const metrics = scorecard.metrics.map(m => {
      const { value: display,     count: c1 } = scrubValue(m.display,     patterns);
      const { value: explanation, count: c2 } = scrubValue(m.explanation, patterns);
      const { value: notes,       count: c3 } = scrubValue(m.notes,       patterns);
      total += c1 + c2 + c3;
      return { ...m, display, explanation, notes };
    });
    scrubbedScorecard = { ...scorecard, metrics };
  }

  return {
    timeline: { ...timeline, entries: scrubbedEntries },
    scorecard: scrubbedScorecard,
    count: total,
  };
}
