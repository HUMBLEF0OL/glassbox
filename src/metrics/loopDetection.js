/**
 * src/metrics/loopDetection.js — Loop Detection (BR-09/AC-08).
 * Flags repeated identical tool calls or repeated file edits above a threshold.
 * Trace: BR-09, AC-08, NFR-06
 */
import { stableStringify } from './helpers.js';
import { DEFAULTS } from '../config.js';

/**
 * @param {import('../normalize.js').Event[]} events
 * @param {{ threshold?: number }} options
 * @returns {import('./index.js').MetricResult}
 */
export function compute(events, options = {}) {
  const threshold = Number(options.threshold) || DEFAULTS.loopThreshold;

  // Count repeated tool calls (name + stableStringify(input))
  const toolCallCounts = new Map();
  for (const ev of events) {
    if (ev.type !== 'tool_call') continue;
    const key = `${ev.tool?.name ?? ''}|${stableStringify(ev.tool?.input ?? {})}`;
    toolCallCounts.set(key, (toolCallCounts.get(key) ?? 0) + 1);
  }
  const repeatedCalls = [...toolCallCounts.entries()]
    .filter(([, count]) => count >= threshold)
    .map(([key, count]) => ({ key, count }));

  // Count repeated file edits (per target path)
  const editCounts = new Map();
  for (const ev of events) {
    if (ev.type !== 'tool_call' || ev.tool?.category !== 'edit') continue;
    for (const target of ev.tool?.targets ?? []) {
      editCounts.set(target, (editCounts.get(target) ?? 0) + 1);
    }
  }
  const repeatedEdits = [...editCounts.entries()]
    .filter(([, count]) => count >= threshold)
    .map(([file, count]) => ({ file, count }));

  const totalLoops = repeatedCalls.length + repeatedEdits.length;

  if (totalLoops === 0) {
    return {
      id: 'loopDetection',
      label: 'Loop Detection',
      display: 'No loops',
      explanation: `No repeated tool calls or file edits at or above threshold (${threshold}).`,
      status: 'ok',
      notes: null,
      raw: { threshold, repeatedCalls, repeatedEdits },
    };
  }

  const details = [
    ...repeatedCalls.map(({ key, count }) => `call "${key.split('|')[0]}" ×${count}`),
    ...repeatedEdits.map(({ file, count }) => `edit "${file}" ×${count}`),
  ];

  return {
    id: 'loopDetection',
    label: 'Loop Detection',
    display: `${totalLoops} loop(s) detected`,
    explanation: `${repeatedCalls.length} repeated call(s) and ${repeatedEdits.length} repeated edit(s) at threshold ${threshold}.`,
    status: 'alert',
    notes: details.slice(0, 5).join('; ') + (details.length > 5 ? '…' : ''),
    raw: { threshold, repeatedCalls, repeatedEdits },
  };
}
