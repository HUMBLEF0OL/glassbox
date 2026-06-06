# Technical Specification Document — Glassbox

*Technical design for a Claude Code session observer that makes agent behaviour visible and measurable.*

## Document Control

| Field | Value |
|---|---|
| Document title | Glassbox — Technical Specification Document |
| Version | 1.0 |
| Status | Draft for review |
| Date | 6 June 2026 |
| Author | Engineering |
| Source of truth | Glassbox — Business Requirements Document v1.0 (`docs/Glassbox_BRD.md`) |
| Related documents | Harness engineering course notes; Claude Code workflow docs |

| Version | Date | Change |
|---|---|---|
| 1.0 | 6 Jun 2026 | Initial TSD derived from BRD v1.0; sliced into 6 implementation increments |
| 1.1 | 6 Jun 2026 | Post-audit gap fixes: completed traceability matrix (OBJ-1/2, RSK-05, DEP-01, ASM-05); annotated TSD extensions (--latest flag, compare delta column) |

---

## 1. Purpose & Reading Guide

This document translates the Glassbox BRD into an implementable technical design. It defines the
architecture, data model, algorithms, interfaces, and a slice-by-slice delivery plan.

It is organized as:

- **Sections 2–6** — global design that all slices share (architecture, data model, tool
  classification, configuration, cross-cutting concerns).
- **Section 7** — the delivery plan: six vertical slices, each independently shippable, each
  traced back to BRD requirements (BR/NFR/AC).
- **Section 8** — the test strategy.
- **Section 9** — traceability matrix (BRD → TSD).

A "slice" is a vertical increment that leaves the tool in a working, demonstrable state. A reader
implementing Glassbox should build slices in order; each slice's "Definition of Done" gates the next.

---

## 2. Architecture Overview

### 2.1 Design principles (from NFR-02, NFR-03, NFR-06, CON-03, CON-04)

1. **No build step, no transpile.** Plain ESM JavaScript runnable directly by Node (`node bin/glassbox.js`).
2. **Zero or near-zero runtime dependencies.** Use only Node built-ins (`fs`, `path`, `os`,
   `readline`, `node:test`). Any dependency must be justified against NFR-03.
3. **Strict layering.** Parsing, metric computation, and rendering are separate modules with no
   back-references, so metrics can be added as discrete units (NFR-06).
4. **Single normalization boundary.** All knowledge of the raw transcript schema lives in one
   module; everything downstream consumes the normalized model only (RSK-01 mitigation).
5. **Local-only, passive, read-only.** No network calls, no agent control (NFR-01, Section 4.2).
6. **Graceful degradation by default.** Missing fields produce `"unknown"`, never a crash
   (BR-13, NFR-05).

### 2.2 Pipeline

```mermaid
flowchart LR
    A[discover<br/>locate transcript] --> B[read<br/>stream JSONL lines]
    B --> C[parse + normalize<br/>raw line -> Event]
    C --> D[classify<br/>tag tool category]
    D --> E[timeline<br/>ordered Event[]]
    E --> F[metrics engine<br/>6 metrics]
    E --> G[render<br/>self-contained HTML]
    F --> G
    G --> H[report.html]
    F --> I[compare<br/>two sessions]
```

### 2.3 Module map

```
glassbox/
  package.json            # type: module, bin entry, no build scripts
  bin/
    glassbox.js           # thin shebang wrapper -> src/cli.js
  src/
    cli.js                # arg parsing, command dispatch (Slice 0/2/5)
    config.js             # defaults, classification tables, secret patterns
    discover.js           # OS-aware transcript location (Slice 1)
    read.js               # streaming JSONL reader, bad-line counting (Slice 1)
    normalize.js          # raw line -> Event (Slice 1)
    classify.js           # tool name -> category + targets (Slice 1)
    timeline.js           # Event[] -> ordered timeline model (Slice 2)
    metrics/
      index.js            # registry + runAll() (Slice 3)
      helpers.js          # stableStringify, successOf, taskSegments (Slice 3)
      grepSemantic.js     # BR-04 (Slice 3)
      earlyVictory.js     # BR-05 (Slice 3)
      verificationDensity.js # BR-06 (Slice 3)
      overreach.js        # BR-07 (Slice 3)
      continuity.js       # BR-08 (Slice 3)
      loopDetection.js    # BR-09 (Slice 3)
    redact.js             # secret redaction (Slice 4)
    render/
      template.js         # HTML scaffold, inline CSS/JS (Slice 2/4)
      report.js           # single-session report assembly (Slice 2/4)
      compare.js          # two-session side-by-side (Slice 5)
  test/
    fixtures/             # synthetic + sanitized real transcripts
    *.test.js             # node:test suites
  PROGRESS.md             # harness state file (Slice 0, OBJ-5)
  CLAUDE.md               # harness instruction file (Slice 0, OBJ-5)
  verify.sh / verify.ps1  # harness verify command (Slice 0, OBJ-5)
```

### 2.4 Runtime flow (single session)

```
cli.js
  -> discover.resolveTranscript(path?)          // Slice 1
  -> read.streamLines(file)                      // Slice 1  -> {lines, skipped}
  -> normalize.toEvents(lines)                   // Slice 1  -> Event[]
  -> classify.annotate(events)                   // Slice 1  -> Event[]
  -> timeline.build(events)                       // Slice 2  -> Timeline
  -> metrics.runAll(events, options)             // Slice 3  -> Scorecard
  -> redact.scrub(timeline, scorecard, opts)     // Slice 4
  -> render.report(timeline, scorecard, meta)    // Slice 2/4 -> html string
  -> fs.writeFile(out, html); optional open      // Slice 2
```

---

## 3. Data Model

The normalized model is the contract between layers. It is intentionally tolerant: any field that
cannot be derived is set to `null` and the reason recorded in `event.warnings`.

### 3.1 `Event`

```js
/**
 * @typedef {Object} Event
 * @property {number}  seq        Monotonic 0-based index in arrival order.
 * @property {?string} ts         ISO-8601 timestamp, or null if absent.
 * @property {EventType} type     'user' | 'assistant' | 'tool_call' | 'tool_result' | 'system' | 'unknown'
 * @property {?string} text       Message text for user/assistant; null otherwise.
 * @property {?ToolCall} tool     Present when type === 'tool_call'.
 * @property {?ToolResult} result Present when type === 'tool_result'.
 * @property {?string} toolUseId  Correlates a tool_result to its tool_call.
 * @property {Object}  raw        The original parsed JSON object (for debugging only).
 * @property {string[]} warnings  Non-fatal normalization notes.
 */
```

```js
/**
 * @typedef {Object} ToolCall
 * @property {string}   name      Raw tool name from the transcript.
 * @property {ToolCategory} category  'search'|'semantic'|'edit'|'verify'|'read'|'other'|'unknown'
 * @property {Object}   input     Raw tool input object.
 * @property {string[]} targets   File paths the call touches (best-effort, may be empty).
 * @property {?string}  command   For shell/verify tools, the command string if extractable.
 */

/**
 * @typedef {Object} ToolResult
 * @property {?boolean} ok        true/false success, or null if undeterminable.
 * @property {?number}  exitCode  Process exit code if present.
 * @property {string}   text      Result/output text (possibly truncated).
 * @property {boolean}  isError   Transcript-flagged error result.
 */
```

`ToolCategory` semantics:

| Category | Meaning | Drives metric |
|---|---|---|
| `search` | Text/regex code navigation (grep, ripgrep, text search) | BR-04 |
| `semantic` | LSP / language-server navigation (definition, references, usages, symbols) | BR-04 |
| `edit` | File mutation (create, write, replace, apply patch) | BR-06, BR-07, BR-09 |
| `verify` | Test / lint / build / typecheck execution | BR-05, BR-06 |
| `read` | Non-mutating file/dir inspection | BR-08 |
| `other` | Recognized tool not in the above buckets | — |
| `unknown` | Tool name not recognized | degraded (BR-13) |

### 3.2 `Timeline`

```js
/**
 * @typedef {Object} Timeline
 * @property {TimelineEntry[]} entries   Render-ready, chronologically ordered.
 * @property {Object} counts             { user, assistant, tool_call, tool_result, unknown, ... }
 * @property {?string} startTs
 * @property {?string} endTs
 */
```

### 3.3 `Scorecard` / `MetricResult`

Every metric returns the same shape so rendering and comparison stay uniform.

```js
/**
 * @typedef {Object} MetricResult
 * @property {string}  id          Stable key, e.g. 'grepSemantic'.
 * @property {string}  label       Human label, e.g. 'Grep vs Semantic'.
 * @property {string}  explanation One-sentence plain-English meaning (NFR-07).
 * @property {'ok'|'warn'|'alert'|'unknown'} status  Drives report styling.
 * @property {string}  display     Primary value as shown, e.g. '7:2 (0.78 text-search)'.
 * @property {Object}  detail      Metric-specific structured numbers (counts etc.).
 * @property {string[]} notes      Caveats, e.g. 'no semantic data observed'.
 */

/**
 * @typedef {Object} Scorecard
 * @property {MetricResult[]} metrics   Always all six, in fixed order.
 * @property {Object} meta              { transcriptPath, generatedAt, skippedLines, eventCount }
 */
```

---

## 4. Tool Classification (Section 2.4 detail, drives BR-04..BR-09)

Classification is the single most schema-sensitive piece and is isolated in `classify.js` +
`config.js` so it can be tuned after real-log discovery (RSK-02 mitigation, ASM-03).

### 4.1 Strategy

1. **Name table first.** A configurable map keys on normalized tool names (lowercased, MCP
   prefixes stripped) to a category. Patterns are matched as: exact name → regex fallback.
2. **Command sniffing for `verify`.** When a tool is a shell runner (e.g. `bash`, `shell`,
   `run_in_terminal`), inspect the command string against verify patterns
   (`/\b(npm|pnpm|yarn) (run )?(test|lint|build)\b/`, `/\b(pytest|jest|vitest|tsc|eslint|go test|cargo (test|build))\b/`, `/\bnpx (tsc|eslint|vitest|jest)\b/`).
   A shell call that matches → `verify`; otherwise `other`.
3. **Target extraction.** From known input shapes pull file paths: `input.path`, `input.file_path`,
   `input.filePath`, `input.targets[]`, `input.files[]`, and (for edits) any field ending in `path`.
   Paths are normalized to POSIX separators and made workspace-relative when a root is known.
4. **Semantic detection (ASM-04, RSK-03).** Treat as `semantic` any tool whose normalized name
   matches the semantic table (e.g. `listcodeusages`, `definition`, `references`, `gotodefinition`,
   `documentsymbol`, `hover`, `*lsp*`). If no semantic tools ever appear, BR-04 reports
   text-search-only with a note (ASM-04 fallback).

### 4.2 Default classification table (initial, revised after discovery)

| Category | Initial name matches (case-insensitive, prefix-stripped) |
|---|---|
| `search` | `grep`, `grep_search`, `ripgrep`, `rg`, `search`, `text_search`, `findtext` |
| `semantic` | `listcodeusages`, `*definition*`, `*references*`, `documentsymbol`, `workspacesymbol`, `hover`, `*lsp*`, `gotoimplementation` |
| `edit` | `edit`, `str_replace*`, `replace_string*`, `create_file`, `write`, `apply_patch`, `insert*`, `multi_replace*`, `notebook_edit*` |
| `verify` | `run_in_terminal`/`bash`/`shell` **iff** command matches verify patterns; `run_tests`, `runtests`, `testfailure` |
| `read` | `read_file`, `read`, `cat`, `list_dir`, `file_search`, `glob`, `view`, `open` |
| `other` | recognized but uncategorized |

> The table lives in `config.js` as data, not code, so a single edit re-tunes classification after
> the discovery task (ASM-02/ASM-03, Open Question 1/3).

---

## 5. Configuration & CLI Contract

### 5.1 CLI surface (BR-11, BR-12, AC-09, AC-10)

```
glassbox <transcript>                 Generate a report for one session.
glassbox compare <a> <b>              Side-by-side report for two sessions.

Options (single-session):
  --out <file>        Output HTML path. Default: ./glassbox-report.html
  --open              Open the report in the default browser after writing.
  --redact            Apply secret redaction to rendered content (NFR-01, RSK-04).
  --scope <glob...>   Intended file scope for overreach (BR-07/AC-06). Repeatable.
  --json <file>       Also emit the normalized event stream as JSON (Open Question 4).
  --threshold <n>     Loop-detection repeat threshold (default 3). (BR-09/AC-08)
  --latest            Resolve newest transcript via discovery instead of a path arg. [TSD extension — not required by BRD BR-11; convenience only]
  --help / --version
```

Exit codes: `0` success; `1` unrecoverable error (file unreadable, no events); never crash on
content (NFR-05). Argument parsing uses Node's built-in `util.parseArgs` (no dependency).

`--open` platform note: on POSIX use `open`/`xdg-open`; on Windows `start` is a cmd built-in — spawn via `spawn('cmd', ['/c', 'start', path])`.

### 5.2 `config.js` contents

- `CLASSIFICATION` table (Section 4.2).
- `VERIFY_PATTERNS` regex list.
- `COMPLETION_PATTERNS` for early-victory (Section 7.4).
- `STATE_FILE_PATTERNS` for continuity (Section 7.6).
- `SECRET_PATTERNS` for redaction (Section 7.7).
- `DEFAULTS` (`outPath`, `loopThreshold`, etc.).

All are plain exported arrays/objects to keep tuning declarative.

---

## 6. Cross-Cutting Concerns

| Concern | Approach | Trace |
|---|---|---|
| Privacy | No `http`/`https`/`net`/`dns` imports anywhere; CI/test asserts none exist (AC-11). | NFR-01, RSK-04 |
| Robustness | `read.js` wraps each `JSON.parse` in try/catch; bad lines counted, not thrown (AC-12). | NFR-05, BR-13 |
| Degradation | Unknown tool/type → category `unknown`, metric notes "incomplete data". | BR-13 |
| Performance | Streaming line read; O(n) single pass per metric; target < few seconds (NFR-04). | NFR-04 |
| Maintainability | One metric per file, registered in `metrics/index.js`; pure functions of `Event[]`. | NFR-06 |
| Portability | `discover.js` resolves OS-specific paths via `os.homedir()` + platform branches. | NFR-02, CON-02 |

---

## 7. Delivery Plan — Implementation Slices

Six slices. Each section gives: goal, scope (BRD trace), components, design detail, and a
Definition of Done (DoD) that must pass before the next slice begins.

> **Slicing rationale.** A single "build everything" unit is too large to implement and verify
> safely against an undocumented input format (RSK-01/RSK-02). Slices are cut vertically so each one
> ends in a runnable artifact and de-risks the next: discovery validates the schema before metrics
> depend on it; the report skeleton exists before metrics fill it; metrics are independent units.

### Slice 0 — Harness & Project Skeleton

**Goal.** Stand up the minimal harness the tool is built *under* (OBJ-5) and a runnable empty CLI.

**Scope / trace.** OBJ-4, OBJ-5, CON-03, CON-04, NFR-02, NFR-03.

**Components.**
- `package.json` (`"type": "module"`, `bin.glassbox` → `bin/glassbox.js`, no build/transpile scripts).
- `bin/glassbox.js` shebang wrapper importing `src/cli.js`.
- `src/cli.js` stub: prints `--help`/`--version`, exits 0.
- Harness files: `CLAUDE.md` (instruction file), `PROGRESS.md` (state file), `verify.ps1`/`verify.sh`
  running `node --test` + a no-network check.
- `test/` folder with one smoke test (`cli --version` exits 0).

**DoD.**
- `node bin/glassbox.js --version` prints a version and exits 0.
- `node --test` runs and passes the smoke test.
- No third-party runtime dependencies declared.

---

### Slice 1 — Discovery, Read & Normalize (the schema boundary)

**Goal.** Turn a real transcript on disk into a normalized, classified `Event[]`, proving the
reverse-engineered schema before anything depends on it.

**Scope / trace.** BR-01, BR-02, BR-13, NFR-05, CON-01, CON-02, ASM-01/02/03, RSK-01/02, AC-01, AC-12.

**Components.**

1. **`discover.js`** (BR-01, CON-02, NFR-02)
   - `resolveTranscript({ path, latest })`:
     - If `path` given and exists → return it.
     - If `--latest` → search platform config locations for `*.jsonl`, return newest by mtime.
     - Candidate roots by platform:
       - Windows: `%APPDATA%`, `%USERPROFILE%/.claude`, `%USERPROFILE%/.config/claude`.
       - macOS/Linux: `~/.claude`, `~/.config/claude`, `$XDG_CONFIG_HOME/claude`.
     - **First implementation task is the discovery spike** (ASM-02, Open Question 1): run against
       the real machine, record the confirmed path/layout in `PROGRESS.md`, then pin candidates.
   - Returns `{ file, source: 'arg'|'latest', candidatesTried }`.

2. **`read.js`** (BR-02, NFR-05, AC-12)
   - `streamLines(file)` using `readline` over a read stream.
   - For each line: trim; skip empty; `JSON.parse` in try/catch.
   - Returns `{ records: object[], skipped: number, total: number }`. Never throws on content.

3. **`normalize.js`** (BR-02, BR-13)
   - `toEvents(records)` maps each raw record to an `Event` (Section 3.1).
   - Type inference order: explicit role/type fields → presence of tool-use block → presence of
     tool-result block → fallback `unknown`.
   - Correlate `tool_result` to `tool_call` via `toolUseId` when present.
   - Extract `ts` from any of `timestamp`/`ts`/`created_at`; null if none.
   - All unknown shapes → `type:'unknown'`, push reason to `warnings`.
   - **All schema knowledge is confined to this module** (RSK-01 mitigation).

4. **`classify.js`** (Section 4)
   - `annotate(events)` fills `tool.category`, `tool.targets`, `tool.command` using `config.js`.

5. **CLI integration (partial).**
   - `glassbox <transcript> --json out.json` runs discover→read→normalize→classify and writes the
     event stream + counts (satisfies AC-01 early; supports Open Question 4).

**Key algorithm — type inference (resilient).**
```
function inferType(rec):
  if rec.type in known: use it
  elif rec.role == 'system': 'system'
  elif rec.role == 'user': 'user'
  elif rec.role == 'assistant' and hasToolUse(rec): emit assistant text + tool_call(s)
  elif rec.role == 'assistant': 'assistant'
  elif hasToolResult(rec): 'tool_result'
  else: 'unknown' (+warning)
```
> A single assistant record may contain text **and** one or more tool-use blocks; `normalize` may
> expand one raw record into multiple `Event`s (assistant text, then each tool_call), preserving
> `seq` order. This is required for accurate metric counting.

**DoD (AC-01, AC-12).**
- Given a real transcript, `--json` output reports counts per event type without crashing.
- Given a transcript with malformed/truncated lines, the run completes and reports skipped count.
- `PROGRESS.md` records the confirmed on-disk path and any schema deviations found (ASM-02/03).
- Classification table updated to match real tool names observed.

---

### Slice 2 — Timeline + Report Skeleton + CLI

**Goal.** Produce a readable, self-contained HTML report containing a chronological timeline, driven
by a single command. (No metrics yet — the scorecard area is a placeholder.)

**Scope / trace.** BR-03, BR-10, BR-11, NFR-04, NFR-07, AC-02, AC-09.

**Components.**

1. **`timeline.js`** (BR-03)
   - `build(events)` → `Timeline` (Section 3.2): map each event to a `TimelineEntry`
     `{ seq, ts, kind, title, summary, badge }` where:
     - user/assistant → truncated text summary.
     - tool_call → `title = tool.name`, `badge = category`, `summary` = targets/command.
     - tool_result → ok/error badge + truncated output.
   - Compute `counts`, `startTs`, `endTs`.

2. **`render/template.js`** (BR-10, NFR-01, NFR-07)
   - `page({ title, head, body })` → full HTML document with **inline** CSS and JS only; no external
     URLs, fonts, CDNs, or fetches (AC-11 safe).
   - Minimal styling: timeline column, colored category badges, legible without source (NFR-07).

3. **`render/report.js`** (BR-10)
   - `report({ timeline, scorecard?, meta })` assembles header (transcript path, generated time,
     event count, skipped lines), the timeline section, and a scorecard placeholder section.

4. **`cli.js`** (BR-11, AC-09)
   - Full single-session command: discover→read→normalize→classify→timeline→render→write file;
     `--open` launches via platform opener (`start`/`open`/`xdg-open`) **without** network.

**DoD (AC-02, AC-09).**
- `glassbox <transcript>` writes a self-contained HTML file in one command.
- Opening the file shows a chronological, readable timeline of session actions.
- Report generated in a few seconds for a typical transcript (NFR-04 spot-check).
- HTML contains no external resource references (grep for `http`).

---

### Slice 3 — Metrics Engine + Six Metrics

**Goal.** Compute all six scorecard metrics as independent, pure units and attach them to the report.

**Scope / trace.** BR-04..BR-09, AC-03..AC-08, NFR-06, ASM-03/04, RSK-03.

**Engine.**
- `metrics/index.js` exports `REGISTRY` (ordered array of metric modules) and
  `runAll(events, options) → Scorecard`. Each module exports
  `compute(events, options) → MetricResult` (Section 3.3). Adding a metric = adding one file + one
  registry entry (NFR-06).

**7.4 Metric definitions (operationalized from Section 12 of the BRD).**

| # | Module | BR / AC | Definition | Degraded behaviour |
|---|---|---|---|---|
| 1 | `grepSemantic` | BR-04 / AC-03 | `searchCount` = events with category `search`; `semanticCount` = category `semantic`. `display` shows both counts and ratio `search:semantic` (and proportion). | If `semanticCount==0`: report text-search-only, `status:'unknown'`, note (ASM-04/RSK-03). |
| 2 | `earlyVictory` | BR-05 / AC-04 | Find `lastEditSeq` (max seq of category `edit`). Find any `verify` **result with ok==true** at seq > `lastEditSeq` → `postEditVerifyOk`. Find completion claim: any assistant `text` matching `COMPLETION_PATTERNS`. Flag **raised** iff `completionClaim && !postEditVerifyOk`. | If no edits or no completion claim → not raised; if verify ok undeterminable → note + `status:'unknown'`. |
| 3 | `verificationDensity` | BR-06 / AC-05 | `edits` = count category `edit`; `verifiesOk` = count `verify` results with ok==true. `display = edits + ' / ' + verifiesOk`; ratio = `edits/verifiesOk`. Show both counts. | `verifiesOk==0` → ratio shown as `∞`, `status:'alert'`. |
| 4 | `overreach` | BR-07 / AC-06 | Segment session into tasks at user-message boundaries (default) **plus** a session-level aggregate. Per task: `distinctFilesChanged` = unique `edit` targets. If `--scope` globs provided, flag targets not matching any glob as out-of-scope. `display` = distinct file count (+ N out-of-scope). | No scope provided → report count only, no flags (AC-06 conditional). |
| 5 | `continuity` | BR-08 / AC-07 | Let `firstEditSeq` = min seq of category `edit`. `stateRead` = exists a `read` event with a target matching `STATE_FILE_PATTERNS` at seq < `firstEditSeq`. Report boolean. | No edits → "n/a (no edits)"; no read data → `unknown`. |
| 6 | `loopDetection` | BR-09 / AC-08 | Key each `tool_call` by `name + stableStringify(input)`. Flag any key occurring ≥ `threshold` (default 3). Separately flag any single file with ≥ `threshold` edit calls. `display` = number of detected loops; `detail` lists offending keys/targets. | Threshold configurable via `--threshold`. |

**7.4.1 Supporting helpers.**
- `stableStringify(obj)` — deterministic key-sorted JSON for loop hashing.
- `successOf(resultEvent)` — derives `ok` from `exitCode===0`, `isError`, or output text patterns
  (e.g. presence of `FAIL`/`error`), with `null` when undeterminable (feeds degraded paths).
- `taskSegments(events)` — splits at user messages, returns `{ start, end, userText }[]`.

**Render integration.** `render/report.js` replaces the Slice-2 placeholder with a scorecard
section: one card per metric showing `label`, `display`, `explanation`, status color, and `notes`
(NFR-07). Order fixed per `REGISTRY`.

**DoD (AC-03..AC-08).**
- Each metric has unit tests over synthetic fixtures covering the normal and degraded path.
- The report shows all six metrics with counts and explanations.
- Removing all semantic events still produces a valid BR-04 result (ASM-04 fallback verified).

---

### Slice 4 — Secret Redaction

**Goal.** Make rendered reports safe to keep/share by optionally scrubbing obvious secrets.

**Scope / trace.** NFR-01, RSK-04, CON (privacy).

**Components.**
- `redact.js`:
  - `scrub(text, patterns) → { text, count }` replacing matches with `«redacted:‹kind›»`.
  - `scrubModel(timeline, scorecard, opts)` walks all rendered string fields (timeline summaries,
    result text, metric detail) and applies redaction when `--redact` is set.
- `SECRET_PATTERNS` in `config.js`:
  - OpenAI/Anthropic-style keys (`/sk-[A-Za-z0-9-_]{16,}/`, `/sk-ant-[A-Za-z0-9-_]+/`).
  - AWS access keys (`/AKIA[0-9A-Z]{16}/`), bearer tokens, `Authorization:` headers.
  - PEM private-key blocks, `.env`-style `KEY=value` for `*_KEY|*_TOKEN|*_SECRET|PASSWORD`.
  - Generic high-entropy long strings (guarded to limit false positives).
- Report header shows a redaction banner and the redaction count when active; an un-redacted run
  shows a warning that the report may contain sensitive content (RSK-04).

**DoD.**
- With `--redact`, seeded secrets in a fixture transcript do not appear in the HTML; count shown.
- Without `--redact`, the report renders and displays the sensitivity warning.

---

### Slice 5 — Two-Session Comparison

**Goal.** Render two sessions side-by-side on the same six metrics to evaluate harness changes.

**Scope / trace.** BR-12, OBJ-3, AC-10.

**Components.**
- `cli.js` `compare <a> <b>` runs the full pipeline for each session independently, producing two
  `Scorecard`s and two `Timeline`s.
- `render/compare.js`:
  - Reuses `render/template.js`.
  - Renders a metrics table: rows = the six metrics, columns = Session A / Session B. [TSD
    extension beyond BRD "basic side-by-side": adds a delta column where numeric — e.g.
    verification density change, overreach change, loop count change — and direction labels
    (improvement / regression). This extends AC-10 but does not conflict with it.]
  - Optionally renders both timelines in collapsible columns.
- Redaction (`--redact`) and `--scope` apply to both sessions.

**DoD (AC-10).**
- `glassbox compare a.jsonl b.jsonl` produces one HTML page comparing both on all six metrics.
- Numeric deltas are correct and direction-labelled (improvement vs regression where meaningful).

---

## 8. Test Strategy

| Layer | Tool | Coverage |
|---|---|---|
| Unit | `node:test` | `normalize`, `classify`, each metric (normal + degraded), `redact`, `stableStringify`, `successOf`. |
| Fixtures | `test/fixtures/` | Synthetic JSONL: clean session, malformed lines, no-semantic session, no-verify session, looped calls, seeded secrets, multi-task overreach. Plus one **sanitized real** transcript captured in Slice 1. |
| Integration | `node:test` | Full pipeline per command (`report`, `compare`) asserting output structure and counts. |
| Privacy | `node:test` + grep | Assert no `http/https/net/dns` imports; assert generated HTML has no external URLs (AC-11). |
| Robustness | `node:test` | Malformed-line fixture completes and reports skip count (AC-12). |
| Performance | manual/CI timer | Typical transcript report under the NFR-04 budget. |

`verify.ps1`/`verify.sh` (Slice 0) runs `node --test` plus the no-network grep, and is the harness
verify command (OBJ-5).

---

## 9. Traceability Matrix (BRD → TSD)

| BRD item | Where satisfied |
|---|---|
| BR-01 (locate/read JSONL) | Slice 1 — `discover.js`, `read.js` |
| BR-02 (normalize event stream) | Slice 1 — `read.js`, `normalize.js` |
| BR-03 (timeline) | Slice 2 — `timeline.js` |
| BR-04 (grep vs semantic) | Slice 3 — `metrics/grepSemantic.js`; Section 4 |
| BR-05 (early victory) | Slice 3 — `metrics/earlyVictory.js` |
| BR-06 (verification density) | Slice 3 — `metrics/verificationDensity.js` |
| BR-07 (overreach) | Slice 3 — `metrics/overreach.js`; `--scope` |
| BR-08 (continuity) | Slice 3 — `metrics/continuity.js` |
| BR-09 (loop detection) | Slice 3 — `metrics/loopDetection.js`; `--threshold` |
| BR-10 (self-contained HTML) | Slice 2/4 — `render/template.js`, `report.js` |
| BR-11 (CLI) | Slice 2 — `cli.js` |
| BR-12 (compare) | Slice 5 — `render/compare.js` |
| BR-13 (graceful degradation) | Slices 1 & 3 — `unknown` category, metric notes |
| NFR-01 (privacy/redaction) | Slice 4 — `redact.js`; Section 6; AC-11 tests |
| NFR-02 (portability/no build) | Slice 0/1 — `discover.js` platform branches |
| NFR-03 (dependency minimalism) | Slice 0 — built-ins only |
| NFR-04 (performance) | Section 8 perf check; streaming read |
| NFR-05 (robustness) | Slice 1 — `read.js` try/catch + skip count |
| NFR-06 (maintainability) | Slice 3 — one metric per file, registry |
| NFR-07 (usability) | Slice 2/3 — labelled, explained cards |
| AC-01..AC-12 | DoD of Slices 1–5 + Section 8 |
| OBJ-3 | Slice 5 |
| OBJ-4/OBJ-5 | Slice 0 — harness files, no build step |
| Open Question 1/3 (schema/LSP) | Slice 1 discovery spike; `config.js` tuning |
| Open Question 4 (JSON export) | Slice 1 `--json` |
| RSK-01/02 (schema drift) | Single normalization boundary; discovery-first |
| RSK-03 (LSP flag) | BR-04 best-effort fallback |
| RSK-04 (secret leak) | Slice 4 redaction + warnings |
| RSK-05 (scope creep) | Six-slice delivery plan; BRD §4.2 out-of-scope boundary enforced — no long-term storage, no multi-session analytics, no service infrastructure |
| OBJ-1 (observable in one command) | Slices 1 & 2 — `discover.js` + `cli.js` + `render/report.js`; AC-09 |
| OBJ-2 (all six metrics, defined calculations) | Slice 3 — `metrics/` engine; §7.4 operationalized definitions; AC-03..AC-08 |
| DEP-01 (Node.js runtime) | Slice 0 — all modules use Node built-in APIs only; `node --test`; no install step required |
| ASM-05 (LSP perf figures indicative) | Not a requirement; BRD explicitly marks as context only with no verification action; TSD makes no performance claim based on these figures |

---

## 10. Open Technical Decisions (to resolve during Slice 1)

1. **Confirmed transcript schema** — exact field names for role/type/tool-use/tool-result and
   timestamp; update `normalize.js` and the classification table accordingly (ASM-02/03).
2. **Semantic tool identity** — which tool names (if any) represent LSP navigation in the user's
   setup; if none, BR-04 runs in text-search-only mode (ASM-04/RSK-03).
3. **Task-scope availability** — whether transcripts encode intended scope for BR-07, or whether
   `--scope` must always supply it (Open Question 2). Default design assumes `--scope`.
4. **Verify-success signal** — the most reliable cross-tool way to read a "passing" verification
   (exit code vs output text); refine `successOf` once real results are observed.
