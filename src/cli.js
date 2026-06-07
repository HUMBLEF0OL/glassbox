/**
 * src/cli.js — command-line entry point (Slice 0 stub; extended in Slices 1/2/5).
 * Exports main(argv) so bin/glassbox.js (and tests) can call it directly.
 *
 * Trace: OBJ-4, NFR-02, CON-03, CON-04
 */
import { parseArgs } from 'util';
import { readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { join, dirname } from 'path';
import { DEFAULTS } from './config.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

/** @returns {string} version from package.json */
function readVersion() {
  const pkg = JSON.parse(
    readFileSync(join(__dirname, '..', 'package.json'), 'utf8')
  );
  return pkg.version;
}

const USAGE = `\
Usage: glassbox [options] <transcript>
       glassbox compare <transcript-a> <transcript-b> [options]

Options:
  --version          Print version and exit.
  --help             Print this help and exit.
  --json <file>      Write normalized event data as JSON (Slice 1).
  --out <file>       Output HTML report path (default: ./glassbox-report.html).
  --latest           Auto-discover the newest transcript on this machine.
  --redact           Scrub secrets from the rendered report (Slice 4).
  --open             Open the report in the default browser after writing.
  --scope <glob>     Intended file scope for overreach detection (repeatable).
  --threshold <n>    Loop-detection repeat threshold (default: 3).
`;

/**
 * @param {string[]} argv
 */
export async function main(argv) {
  const { values, positionals } = parseArgs({
    args: argv,
    options: {
      version: { type: 'boolean', short: 'v', default: false },
      help:    { type: 'boolean', short: 'h', default: false },
      // Slice 1+
      json:      { type: 'string' },
      latest:    { type: 'boolean', default: false },
      // Slice 2+
      out:       { type: 'string' },
      open:      { type: 'boolean', default: false },
      // Slice 3+
      scope:     { type: 'string', multiple: true },
      threshold: { type: 'string' },
      // Slice 4+
      redact:    { type: 'boolean', default: false },
    },
    allowPositionals: true,
    strict: false,
  });

  if (values.version) {
    process.stdout.write(`glassbox v${readVersion()}\n`);
    process.exit(0);
  }

  if (values.help || argv.length === 0) {
    process.stdout.write(USAGE);
    process.exit(0);
  }

  // --- Slice 5: compare command ---
  if (positionals[0] === 'compare') {
    const pathA = positionals[1];
    const pathB = positionals[2];
    if (!pathA || !pathB) {
      process.stderr.write('Error: compare requires two transcript paths.\nUsage: glassbox compare <a.jsonl> <b.jsonl>\n');
      process.exit(1);
    }

    const { resolveTranscript: resolve } = await import('./discover.js');
    const { streamLines: sl }  = await import('./read.js');
    const { toEvents: te }     = await import('./normalize.js');
    const { annotate: ann }    = await import('./classify.js');
    const { build: bld }       = await import('./timeline.js');
    const { runAll: ra }       = await import('./metrics/index.js');
    const { scrubModel: sm }   = await import('./redact.js');
    const { compare: cmpRender } = await import('./render/compare.js');

    async function runSession(path) {
      const loc  = resolve({ path });
      const res  = await sl(loc.file);
      const evts = ann(te(res.records));
      const tl   = bld(evts);
      const sc   = ra(evts, { scope: values.scope ?? [], threshold: values.threshold ? Number(values.threshold) : DEFAULTS.loopThreshold });
      let timeline = tl, scorecard = sc, redactedCount = 0;
      if (values.redact) {
        const { timeline: t, scorecard: s, count } = sm({ timeline, scorecard }, { redact: true });
        timeline = t; scorecard = s; redactedCount = count;
      }
      return { timeline, scorecard, meta: { file: loc.file, eventCount: evts.length, skipped: res.skipped, redacted: values.redact ? redactedCount : undefined } };
    }

    const [sessA, sessB] = await Promise.all([runSession(pathA), runSession(pathB)]);
    const outPath = values.out ?? DEFAULTS.outPath;
    const html = cmpRender({ a: sessA, b: sessB, meta: { generatedAt: new Date().toISOString() } });
    writeFileSync(outPath, html, 'utf8');
    process.stdout.write(`Comparison report written to ${outPath}\n`);
    process.exit(0);
  }

  // --- Slice 1: single-session pipeline (discover → read → normalize → classify → --json) ---
  const { resolveTranscript } = await import('./discover.js');
  const { streamLines }       = await import('./read.js');
  const { toEvents }          = await import('./normalize.js');
  const { annotate }          = await import('./classify.js');

  // Resolve transcript path
  let location;
  try {
    location = resolveTranscript({ path: positionals[0], latest: values.latest });
  } catch (err) {
    process.stderr.write(`Error: ${err.message}\n`);
    process.exit(1);
  }

  // Read → normalize → classify
  let readResult;
  try {
    readResult = await streamLines(location.file);
  } catch (err) {
    process.stderr.write(`Error reading transcript: ${err.message}\n`);
    process.exit(1);
  }

  const { records, skipped } = readResult;
  const events = annotate(toEvents(records));

  if (events.length === 0 && skipped === records.length + skipped) {
    process.stderr.write('Error: no events found in transcript.\n');
    process.exit(1);
  }

  // --json output (AC-01)
  if (values.json) {
    const counts = {};
    for (const ev of events) counts[ev.type] = (counts[ev.type] ?? 0) + 1;
    const output = {
      file: location.file,
      source: location.source,
      total: readResult.total,
      skipped,
      eventCount: events.length,
      counts,
      events,
    };
    try {
      writeFileSync(values.json, JSON.stringify(output, null, 2));
      process.stdout.write(`Wrote ${events.length} events to ${values.json}\n`);
    } catch (err) {
      process.stderr.write(`Error writing JSON: ${err.message}\n`);
      process.exit(1);
    }
    process.exit(0);
  }

  // --- Slice 2+3+4: full single-session report with metrics and optional redaction ---
  const { build }      = await import('./timeline.js');
  const { report }     = await import('./render/report.js');
  const { runAll }     = await import('./metrics/index.js');
  const { scrubModel } = await import('./redact.js');

  let timeline = build(events);
  const outPath  = values.out ?? DEFAULTS.outPath;

  // --- Slice 3: run all six metrics ---
  const scope     = values.scope ?? [];
  const threshold = values.threshold ? Number(values.threshold) : DEFAULTS.loopThreshold;
  let scorecard = runAll(events, { scope, threshold });

  // --- Slice 4: optional secret redaction ---
  let redactedCount = 0;
  if (values.redact) {
    const { timeline: t, scorecard: s, count } = scrubModel({ timeline, scorecard }, { redact: true });
    timeline = t;
    scorecard = s;
    redactedCount = count;
  }

  const meta = {
    file: location.file,
    generatedAt: new Date().toISOString(),
    eventCount: events.length,
    skipped,
    sensitivityWarning: !values.redact,
    redacted: values.redact ? redactedCount : undefined,
  };

  const html = report({ timeline, scorecard, meta });

  try {
    writeFileSync(outPath, html, 'utf8');
  } catch (err) {
    process.stderr.write(`Error writing report: ${err.message}\n`);
    process.exit(1);
  }

  process.stdout.write(`Report written to ${outPath}\n`);

  // --open: launch the report in the default browser (no network — local file only)
  if (values.open) {
    const { spawn } = await import('child_process');
    const { resolve } = await import('path');
    const abs = new URL(`file:///${resolve(outPath).replace(/\\/g, '/')}`).href;
    if (process.platform === 'win32') {
      spawn('cmd', ['/c', 'start', '', abs], { detached: true, stdio: 'ignore' }).unref();
    } else if (process.platform === 'darwin') {
      spawn('open', [abs], { detached: true, stdio: 'ignore' }).unref();
    } else {
      spawn('xdg-open', [abs], { detached: true, stdio: 'ignore' }).unref();
    }
  }

  process.exit(0);
}
