/**
 * src/cli.js — command-line entry point (Slice 0 stub; extended in Slices 1/2/5).
 * Exports main(argv) so bin/glassbox.js (and tests) can call it directly.
 *
 * Trace: OBJ-4, NFR-02, CON-03, CON-04
 */
import { parseArgs } from 'util';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { join, dirname } from 'path';

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

  // Remaining dispatch (Slices 1-5) is added here incrementally.
  process.stderr.write('Error: no command recognized. Run --help for usage.\n');
  process.exit(1);
}
