# Glassbox Hard Rules

These are pass/fail gates. Any violation must be fixed before merge. Derived from the BRD/TSD
non-functional requirements and constraints.

## Architecture

- **No build step / no transpile.** Code runs directly under `node`. (NFR-02, CON-03)
- **Built-ins only.** No third-party runtime dependencies without explicit NFR-03 justification.
- **Single normalization boundary.** Raw-schema knowledge lives only in `src/normalize.js`. No
      other module reads `event.raw` for behaviour. (RSK-01)
- **Strict layering.** No back-references: render must not import metrics' internals; metrics are
      pure functions of `Event[]`. (NFR-06)
- **One metric per file**, registered in `src/metrics/index.js`. (NFR-06)

## Privacy & safety

- **No network imports** (`http`, `https`, `net`, `dns`) anywhere in `src/` or `bin/`. Enforced
      by the verify gate. (NFR-01, AC-11, RSK-04)
- **Read-only & passive.** No writing to the agent's config, no agent control.
- **Self-contained HTML.** Reports inline all CSS/JS; no external URLs, fonts, CDNs, or fetches.
      (BR-10, AC-11)
- **Never commit raw transcripts.** Only sanitized fixtures under `test/fixtures/` are allowed.

## Robustness

- **Never crash on content.** Every `JSON.parse` is guarded; bad lines are counted, not thrown.
      (NFR-05, AC-12)
- **Graceful degradation.** Unknown tool/type → category `unknown`; metrics emit a note instead
      of failing. (BR-13)
- **Deterministic CLI exit codes.** `0` success; `1` unrecoverable (unreadable file / no events).

## Process

- **Verify gate green** before every commit and merge.
- **TDD:** a failing test exists before the implementation that makes it pass.
- **Trace IDs** (BR/NFR/AC/OBJ/RSK) referenced in commits/PRs for auditability.
- **PROGRESS.md updated** with status and any newly discovered schema facts.
