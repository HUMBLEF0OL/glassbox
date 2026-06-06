# PROGRESS.md — Glassbox Harness State

> Harness state file (TSD §2.3, OBJ-5). Update this as work progresses. Keep it terse and factual.
> This is the running record of *what is true now* and *what the discovery spike found*.

## Slice status

| Slice | Title | Branch | Status | Tag |
|---|---|---|---|---|
| 0 | Harness & Project Skeleton | `slice/0-harness` | ✅ done | `v0.1.0` |
| 1 | Discovery, Read & Normalize | `slice/1-normalize` | ✅ done | `v0.2.0` |
| 2 | Timeline + Report Skeleton + CLI | `slice/2-timeline` | ✅ done | `v0.3.0` |
| 3 | Metrics Engine + Six Metrics | `slice/3-metrics` | ✅ done | `v0.4.0` |
| 4 | Secret Redaction | `slice/4-redaction` | ✅ done | `v0.5.0` |
| 5 | Two-Session Comparison | `slice/5-compare` | ✅ done | `v1.0.0` |

Legend: ⬜ not started · 🟨 in progress · ✅ done (verify gate green, merged, tagged)

## Discovery spike findings (Slice 1)

Confirmed 2026-06-06 from real Claude Code transcripts on this Windows machine.

- **Confirmed transcript path(s):** `~/.claude/projects/<project-slug>/*.jsonl` (e.g. `~/.claude/projects/e--Projects-and-Learning-glassbox/`)
- **File format / extension:** JSONL (one JSON object per line), `.jsonl`.
- **Record types (top-level `type` field):** `user`, `assistant`, `attachment`, `queue-operation`, `file-history-snapshot`, `last-prompt`, `system`. Only `user` and `assistant` are processed; others are skipped.
- **Role/type field names:** Top-level `type` (not `role`). The `role` field is inside `record.message.role`.
- **Tool-use block shape:** Inside `assistant.message.content[]` — `{ type:'tool_use', id, name, input, caller }`.
- **Tool-result block shape:** Separate `user` record with `toolUseResult` field (NOT inside `message.content`). Correlation: `user.sourceToolAssistantUUID` → `assistant.uuid` (no direct toolUseId in result record).
- **Tool result success signal:** No `exitCode` in raw result. Shell tools have `{ stdout, stderr, interrupted, isImage }`. Derive: `interrupted===true` → fail; `isError` (bool if present); else check stdout/stderr for error keywords; structured results (Read/Edit/Glob) default to ok=true.
- **Timestamp field:** Top-level `timestamp` (ISO 8601 string). Fallbacks: `ts`, `created_at` (none observed).
- **Tool names observed:** `Bash`, `Edit`, `Glob`, `Grep`, `PowerShell`, `Read`, `Skill`, `TodoWrite`, `ToolSearch`, `Write`.
- **Semantic/LSP tool names present:** None observed on this machine → BR-04 runs text-search-only mode (ASM-04/RSK-03). OQ-2 resolved.
- **Classification table deltas:** Added PowerShell, Skill, TodoWrite, ToolSearch to config.js. All observed names now classified.

## Open technical decisions (TSD §10 — resolve during Slice 1)

- [x] 1. Confirmed transcript schema (field names) → updated `normalize.js` + classification table.
- [x] 2. Semantic tool identity: **none observed** on this machine → BR-04 runs text-search-only (ASM-04/RSK-03).
- [x] 3. Task-scope availability: **not encoded** in transcript → `--scope` must always supply it.
- [x] 4. Verify-success signal: no `exitCode` in raw result → derive from `interrupted`, `isError`, or stdout/stderr keywords. Implemented in `normalize.js` `deriveOk()`.

> **JSON export (`--json`):** Resolved — included in Slice 1 as `--json <file>` (Plan task 1.12, AC-01).

## Change log

| Date | Note |
|---|---|
| _init_ | Harness scaffolding created; implementation plan authored. |
| 2026-06-06 | Harness tooling wired: `.claude/settings.json` + hooks (no-network, no-raw-transcript, verify-on-stop, tool-use-logger, session-start), `.mcp.json` (dev-time filesystem+git), `jsconfig.json` (LSP), `harness-workflow` skill, `.claude-plugin/` plugin, `feature_list.json`, `init.ps1`/`init.sh`, and `docs/harness/` (evaluator-rubric, clean-state-checklist, session-handoff). |
| 2026-06-06 | Harness audit fixes: agent `tools:` frontmatter → Claude Code names; unified no-network pattern (covers side-effect + dynamic imports) shared via `hooks/lib.mjs` and mirrored in `verify.ps1`/`verify.sh` (now scan `.mjs`/`.cjs`); no-network & no-raw-transcript guards made `Bash`-aware (matchers updated in both hook configs); skills packaged in `plugin.json`; two-hook-config sync note added to CLAUDE.md; README expanded. Guard matrix verified (8/8 cases). |
| 2026-06-06 | Phase 0 complete: package.json, bin/glassbox.js, src/cli.js, test/cli.smoke.test.js. Verify gate green (3/3 tests). Tagged v0.1.0. |
| 2026-06-06 | Phase 1 complete: discovery spike confirmed schema; src/config.js, discover.js, read.js, normalize.js, classify.js; cli.js wired with --json; 45/45 tests green; real-sanitized fixture produces 28 events (user:3, assistant:11, tool_call:7, tool_result:7). Tagged v0.2.0. |
| 2026-06-06 | Phase 2 complete: src/timeline.js, src/render/template.js, src/render/report.js; glassbox <transcript> writes self-contained HTML; 69/69 tests. Tagged v0.3.0. |
| 2026-06-06 | Phase 3 complete: all six metrics (grepSemantic, earlyVictory, verificationDensity, overreach, continuity, loopDetection); 110/110 tests. Tagged v0.4.0. |
| 2026-06-06 | Phase 4 complete: src/redact.js; --redact flag scrubs secrets; sensitivity warning added; 121/121 tests. Tagged v0.5.0. |
| 2026-06-06 | Phase 5 complete: src/render/compare.js; glassbox compare a.jsonl b.jsonl produces one HTML page with all six metrics side-by-side and deltas; 125/125 tests. Tagged v1.0.0. |
