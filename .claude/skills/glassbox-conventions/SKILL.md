---
name: glassbox-conventions
description: Coding conventions and architectural constraints for the Glassbox repository — ESM-only, zero-dependency, no-network, single normalization boundary, strict layering, one-metric-per-file, graceful degradation. Read when writing or reviewing any code in this repo.
---

# Glassbox Coding Conventions

## Language & runtime

- **ESM only.** `package.json` has `"type": "module"`. Use `import`/`export`, never `require`.
- **No build step.** Code runs directly via `node bin/glassbox.js`. No bundler, no TypeScript
  compile, no Babel.
- **Built-ins only.** Allowed: `fs`, `path`, `os`, `readline`, `node:test`, `util` (`parseArgs`).
  A new dependency requires explicit justification against NFR-03 in the PR.
- **CLI arg parsing** uses `util.parseArgs` — no `commander`/`yargs`.

## Architecture

- **Single normalization boundary:** only `src/normalize.js` understands the raw transcript schema.
  Downstream code consumes the normalized `Event` model (TSD §3.1). Never read `event.raw` for
  behaviour outside debugging.
- **Strict layering:** `discover → read → normalize → classify → timeline → metrics → render`. No
  back-references. `render/` must not reach into metric internals; metrics are pure functions of
  `Event[]`.
- **Classification is data, not code:** tool→category mappings, verify/secret/completion/state-file
  patterns live in `src/config.js` as plain arrays/objects so they can be re-tuned in one edit.
- **One metric per file** in `src/metrics/`, registered in `metrics/index.js` `REGISTRY`.
- **Shared metric utilities** (`stableStringify`, `successOf`, `taskSegments`) live in `src/metrics/helpers.js` — import from there, do not duplicate.

## Behaviour

- **Never crash on content.** Guard every `JSON.parse`; count bad lines, don't throw (NFR-05, AC-12).
- **Graceful degradation.** Unknown type/tool → `unknown`; missing field → `null` + a `warning`.
  Metrics return `status:'unknown'` with a `note` rather than failing (BR-13).
- **Privacy first.** No `http`/`https`/`net`/`dns` imports anywhere. Reports are self-contained
  (inline CSS/JS, no external URLs).
- **Deterministic output.** Use `stableStringify` (key-sorted) for any hashing (e.g. loop detection).

## Testing

- `node:test` only. Co-locate suites in `test/*.test.js`; fixtures in `test/fixtures/`.
- Every metric and normalizer path needs a **normal** and a **degraded** test.
- TDD: failing test first.

## Style

- Small pure functions; explicit returns; JSDoc typedefs for the data model (Event, ToolCall,
  ToolResult, Timeline, MetricResult, Scorecard).
- Reference BRD/TSD trace IDs in comments where a rule is non-obvious.
