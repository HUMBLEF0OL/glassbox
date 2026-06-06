/**
 * src/read.js — streaming JSONL reader (Slice 1).
 * Reads a file line-by-line, parses JSON, counts bad lines.
 * Never throws on malformed content (NFR-05, AC-12).
 *
 * Trace: BR-02, NFR-05, AC-12
 */
import { createReadStream } from 'fs';
import { createInterface } from 'readline';

/**
 * @typedef {Object} ReadResult
 * @property {Object[]} records  - Successfully parsed JSON objects
 * @property {number}   skipped  - Count of lines that failed to parse
 * @property {number}   total    - Total non-empty lines processed
 */

/**
 * Stream-parse a JSONL file.
 * @param {string} file - Absolute path to the .jsonl file
 * @returns {Promise<ReadResult>}
 */
export async function streamLines(file) {
  const records = [];
  let skipped = 0;
  let total = 0;

  const rl = createInterface({
    input: createReadStream(file, { encoding: 'utf8' }),
    crlfDelay: Infinity,
  });

  for await (const raw of rl) {
    const line = raw.trim();
    if (!line) continue;
    total++;
    try {
      records.push(JSON.parse(line));
    } catch {
      skipped++;
    }
  }

  return { records, skipped, total };
}
