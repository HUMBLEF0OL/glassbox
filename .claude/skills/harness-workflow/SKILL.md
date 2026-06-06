---
name: harness-workflow
description: The Glassbox harness operating loop — how to start a session, work one feature at a time, verify before claiming done, and leave a clean handoff. Based on walkinglabs Learn Harness Engineering. Read at the start of any working session and before claiming completion.
---

# Glassbox Harness Workflow

Glassbox is built *under* a harness (OBJ-5) so the tool can later observe the very sessions that
build it. This skill is the operating loop. References: walkinglabs Learn Harness Engineering
(`https://walkinglabs.github.io/learn-harness-engineering/en/`).

## The closed loop

```
Clear objective (CLAUDE.md, rules.md)
   → Initialize (init.ps1 / init.sh: install + verify baseline)
   → Pick ONE feature (feature_list.json, lowest open priority)
   → Implement under TDD (failing node:test first)
   → Verify (verify.ps1 / verify.sh — node --test + no-network grep)
   → Update state (PROGRESS.md, feature_list.json evidence)
   → Clean handoff (clean-state-checklist, session-handoff)
```

## Session start

1. Read `PROGRESS.md` (current slice, confirmed schema, decisions) and `feature_list.json`
   (highest-priority open feature). The `SessionStart` hook surfaces both automatically.
2. Read `.claude/rules.md` (hard pass/fail gates) and the `glassbox-conventions` skill.
3. Run `init.ps1` / `init.sh` to confirm the baseline is green before changing anything. If verify
   is red, fix the baseline first — never build on a red tree.

## While working

- **One feature at a time.** Exactly one `feature_list.json` entry may be `in_progress`. Do not
  start a second (lecture-07: agents overreach and under-finish).
- **TDD.** Write the failing `node:test` first, then the smallest code to pass it.
- **Stay in scope.** Only touch files the selected feature requires (overreach is itself a measured
  metric, BR-07).
- **Single normalization boundary.** Raw-schema knowledge lives only in `src/normalize.js` (RSK-01).

## Before claiming "done" (anti early-victory — lecture-09, BR-05)

Evidence before assertions. A feature is `passing` only when:

1. `verify.ps1` / `verify.sh` is green (`node --test` **and** the no-network grep). The `Stop` hook
   blocks the turn if verify is red.
2. The slice / feature Definition of Done is met.
3. `feature_list.json` has the `evidence` field filled with the actual verification output.
4. `PROGRESS.md` is updated (status + any newly discovered schema facts).

Never mark a feature `passing` from intent alone — run the check and record the result.

## Session end (clean handoff — lecture-12)

Run `docs/harness/clean-state-checklist.md`. Update `docs/harness/session-handoff.md` with what is
verified, what changed, what is still broken, and the next best action. The next session must be able
to continue from repo artifacts alone.

## Guardrails (enforced by hooks — `.claude/settings.json`)

| Hook | Event | Enforces |
|---|---|---|
| `no-network-guard` | PreToolUse (edit/bash) | Blocks `http/https/net/dns` imports into `src/`/`bin/` (NFR-01). |
| `no-raw-transcript-guard` | PreToolUse (edit/bash) | Blocks `.jsonl` writes outside `test/fixtures/` (RSK-04). |
| `tool-use-logger` | PostToolUse | Appends actions to `.claude/logs/tool-use.jsonl` (observability, lecture-11). |
| `verify-on-stop` | Stop | Blocks finishing while the verify gate is red (lecture-09). |
| `session-start` | SessionStart | Injects current slice + next feature + verify command (continuity, lecture-05). |

## Dev-time MCP & LSP (harness only — never in the product)

- `.mcp.json` declares **dev-time** MCP servers (`filesystem`, `git`) used while *building* Glassbox.
  The shipped tool (`src/`, `bin/`) must never import or depend on them, and never makes network
  calls. MCP/LSP are author-side conveniences only.
- `jsconfig.json` powers `typescript-language-server` for semantic navigation of the JS sources.
  Note the product relevance: BR-04 ("Grep vs Semantic") measures how often a *measured* session
  used LSP-style semantic navigation versus text search — see the `transcript-schema` skill.
