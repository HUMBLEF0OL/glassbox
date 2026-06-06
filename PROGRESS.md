# PROGRESS.md — Glassbox Harness State

> Harness state file (TSD §2.3, OBJ-5). Update this as work progresses. Keep it terse and factual.
> This is the running record of *what is true now* and *what the discovery spike found*.

## Slice status

| Slice | Title | Branch | Status | Tag |
|---|---|---|---|---|
| 0 | Harness & Project Skeleton | `slice/0-harness` | ⬜ not started | `v0.1.0` |
| 1 | Discovery, Read & Normalize | `slice/1-normalize` | ⬜ not started | `v0.2.0` |
| 2 | Timeline + Report Skeleton + CLI | `slice/2-timeline` | ⬜ not started | `v0.3.0` |
| 3 | Metrics Engine + Six Metrics | `slice/3-metrics` | ⬜ not started | `v0.4.0` |
| 4 | Secret Redaction | `slice/4-redaction` | ⬜ not started | `v0.5.0` |
| 5 | Two-Session Comparison | `slice/5-compare` | ⬜ not started | `v1.0.0` |

Legend: ⬜ not started · 🟨 in progress · ✅ done (verify gate green, merged, tagged)

## Discovery spike findings (Slice 1)

Record confirmed facts about the real Claude Code transcript here. Until filled, treat as unknown.

- **Confirmed transcript path(s):** _TBD — record the real on-disk location found on this machine._
- **File format / extension:** _TBD (expected `*.jsonl`)._
- **Role/type field names:** _TBD (e.g. `type`, `role`)._
- **Tool-use block shape:** _TBD._
- **Tool-result block shape & success signal:** _TBD (exit code vs `isError` vs output text)._
- **Timestamp field:** _TBD (`timestamp` / `ts` / `created_at`)._
- **Semantic/LSP tool names present:** _TBD — if none, BR-04 runs text-search-only (ASM-04/RSK-03)._
- **Classification table deltas:** _TBD — list real tool names that needed adding to `config.js`._

## Open technical decisions (TSD §10 — resolve during Slice 1)

- [ ] 1. Confirmed transcript schema (field names) → update `normalize.js` + classification table.
- [ ] 2. Semantic tool identity (which names are LSP nav, if any).
- [ ] 3. Task-scope availability (encoded in transcript, or always via `--scope`).
- [ ] 4. Verify-success signal (exit code vs output text) → refine `successOf`.

> **JSON export (`--json`):** Pre-resolved — included in Slice 1 as `--json <file>` (Plan task 1.12, satisfies AC-01 early). Mark resolved when Slice 1 is complete.

## Change log

| Date | Note |
|---|---|
| _init_ | Harness scaffolding created; implementation plan authored. |
| 2026-06-06 | Harness tooling wired: `.claude/settings.json` + hooks (no-network, no-raw-transcript, verify-on-stop, tool-use-logger, session-start), `.mcp.json` (dev-time filesystem+git), `jsconfig.json` (LSP), `harness-workflow` skill, `.claude-plugin/` plugin, `feature_list.json`, `init.ps1`/`init.sh`, and `docs/harness/` (evaluator-rubric, clean-state-checklist, session-handoff). |
| 2026-06-06 | Harness audit fixes: agent `tools:` frontmatter → Claude Code names; unified no-network pattern (covers side-effect + dynamic imports) shared via `hooks/lib.mjs` and mirrored in `verify.ps1`/`verify.sh` (now scan `.mjs`/`.cjs`); no-network & no-raw-transcript guards made `Bash`-aware (matchers updated in both hook configs); skills packaged in `plugin.json`; two-hook-config sync note added to CLAUDE.md; README expanded. Guard matrix verified (8/8 cases). |
