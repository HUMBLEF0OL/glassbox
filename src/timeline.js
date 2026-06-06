/**
 * src/timeline.js — Event[] → Timeline model (Slice 2).
 * Pure function: no I/O, no side effects.
 *
 * Trace: BR-03, TSD §3.2
 */

const MAX_TEXT = 200; // characters before truncation

/**
 * @typedef {Object} TimelineEntry
 * @property {number}      seq
 * @property {string|null} ts
 * @property {string}      kind    - 'user'|'assistant'|'tool_call'|'tool_result'|'system'|'unknown'
 * @property {string}      title
 * @property {string}      summary
 * @property {string}      badge   - category or status label for coloring
 */

/**
 * @typedef {Object} Timeline
 * @property {TimelineEntry[]} entries
 * @property {Record<string,number>} counts  - event type → count
 * @property {string|null}     startTs
 * @property {string|null}     endTs
 */

/**
 * Truncate a string to a maximum length, appending '…' if cut.
 * @param {string} s
 * @param {number} [max]
 * @returns {string}
 */
function trunc(s, max = MAX_TEXT) {
  if (!s || typeof s !== 'string') return '';
  return s.length <= max ? s : s.slice(0, max) + '…';
}

/**
 * Build a Timeline from a normalized, classified Event array.
 * @param {import('./normalize.js').Event[]} events
 * @returns {Timeline}
 */
export function build(events) {
  const entries = [];
  const counts = {};

  for (const ev of events) {
    counts[ev.type] = (counts[ev.type] ?? 0) + 1;

    /** @type {TimelineEntry} */
    let entry;

    switch (ev.type) {
      case 'user':
        entry = {
          seq: ev.seq, ts: ev.ts, kind: 'user',
          title: 'User',
          summary: trunc(ev.text ?? ''),
          badge: 'user',
        };
        break;

      case 'assistant':
        entry = {
          seq: ev.seq, ts: ev.ts, kind: 'assistant',
          title: 'Assistant',
          summary: trunc(ev.text ?? ''),
          badge: 'assistant',
        };
        break;

      case 'tool_call': {
        const cat = ev.tool?.category ?? 'unknown';
        const name = ev.tool?.name ?? 'unknown';
        const targets = ev.tool?.targets ?? [];
        const cmd = ev.tool?.command;
        const targetStr = targets.length > 0 ? targets.slice(0, 3).join(', ') : '';
        const summaryParts = [];
        if (targetStr) summaryParts.push(targetStr);
        if (cmd && cmd !== 'other') summaryParts.push(`[${cmd}]`);
        entry = {
          seq: ev.seq, ts: ev.ts, kind: 'tool_call',
          title: name,
          summary: trunc(summaryParts.join(' ') || JSON.stringify(ev.tool?.input ?? {}).slice(0, 80)),
          badge: cat,
        };
        break;
      }

      case 'tool_result': {
        const ok = ev.result?.ok;
        const badge = ok === true ? 'ok' : ok === false ? 'error' : 'unknown';
        const raw = ev.result?.raw ?? {};
        // Build a brief summary from the result shape
        let summary = '';
        if (typeof raw.stdout === 'string') summary = trunc(raw.stdout.trim());
        else if (typeof raw.content === 'string') summary = trunc(raw.content);
        else if (raw.file?.filePath) summary = trunc(raw.file.filePath);
        else if (Array.isArray(raw.filenames)) summary = `${raw.numFiles ?? raw.filenames.length} file(s)`;
        entry = {
          seq: ev.seq, ts: ev.ts, kind: 'tool_result',
          title: badge === 'ok' ? 'Result: OK' : badge === 'error' ? 'Result: Error' : 'Result',
          summary,
          badge,
        };
        break;
      }

      case 'system':
        entry = {
          seq: ev.seq, ts: ev.ts, kind: 'system',
          title: 'System',
          summary: trunc(ev.text ?? ''),
          badge: 'system',
        };
        break;

      default:
        entry = {
          seq: ev.seq, ts: ev.ts, kind: 'unknown',
          title: 'Unknown',
          summary: '',
          badge: 'unknown',
        };
    }

    entries.push(entry);
  }

  // Events arrive ordered by seq from normalize.js — maintain that order
  entries.sort((a, b) => a.seq - b.seq);

  // Derive startTs / endTs from the first/last non-null ts
  const withTs = entries.filter(e => e.ts != null);
  const startTs = withTs.length > 0 ? withTs[0].ts : null;
  const endTs   = withTs.length > 0 ? withTs[withTs.length - 1].ts : null;

  return { entries, counts, startTs, endTs };
}
