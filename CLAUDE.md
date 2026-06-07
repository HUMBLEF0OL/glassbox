# CLAUDE.md — Glassbox Harness Instructions

> This is the **harness instruction file** (TSD §2.3, OBJ-5). Glassbox is built *under* a harness so
> that the tool itself can later observe and measure the very sessions that build it. Read this file
> before doing any work in this repository.

## What Glassbox is

A local, read-only **Claude Code session observer**. It reads a Claude Code JSONL transcript and
renders a single self-contained HTML report with six behavioural metrics. It never makes network
calls and never controls the agent. See:

- Business requirements → `docs/Glassbox_BRD.md` (kept locally, gitignored — internal planning doc)
- Technical spec (source of truth) → `docs/Glassbox_TSD.md` (kept locally, gitignored)
- Implementation plan → `docs/Glassbox_Implementation_Plan.md` (kept locally, gitignored)

## Golden rules (non-negotiable — violations fail review)

1. **No build step, no transpile.** Plain ESM JavaScript runnable by `node bin/glassbox.js`.
2. **Zero / near-zero runtime dependencies.** Node built-ins only (`fs`, `path`, `os`, `readline`,
   `node:test`, `util.parseArgs`). Any new dependency must be justified in the PR against NFR-03.
3. **No network. Ever.** No `http`, `https`, `net`, `dns` imports anywhere in `src/` or `bin/`. The
   verify gate greps for these and fails if found (NFR-01, AC-11, RSK-04).
4. **Single normalization boundary.** All knowledge of the raw transcript schema lives in
   `src/normalize.js`. Everything downstream consumes the normalized `Event` model only (RSK-01).
5. **Strict layering.** parse → metrics → render, with no back-references. One metric per file.
6. **Graceful degradation.** Missing/unknown fields become `null` / `"unknown"` and a warning —
   never a crash (BR-13, NFR-05).
7. **We are already at the repo root.** Do **not** create a nested `glassbox/` folder. Source lives
   in `src/`, `bin/`, `test/` at the root.

## Repository layout (target)

```
glassbox/                  <- repo root (you are here)
  package.json             # type: module, bin entry, no build scripts
  bin/glassbox.js          # shebang wrapper -> src/cli.js
  src/                     # cli, config, discover, read, normalize, classify, timeline,
                           # metrics/, redact, render/
  test/                    # node:test suites + fixtures/
  CLAUDE.md                # this file
  PROGRESS.md              # harness state file
  verify.ps1 / verify.sh   # the verify gate
  .claude/                 # agents, skills, rules, workflow for this project
  docs/                    # BRD, TSD, implementation plan
```

## The verify gate

`verify.ps1` (Windows) / `verify.sh` (POSIX) is the single source of truth for "is it green?":

```
node --test            # all unit + integration tests pass
no-network grep        # asserts no http/https/net/dns imports exist
```

**Nothing merges to `main` unless the verify gate passes.** Run it before every commit and before
opening a PR.

## Workflow

- Build **one slice at a time, in order** (Phase 0 → 5). Each slice ends in a runnable artifact and
  its Definition of Done gates the next.
- Practice **test-driven development**: write the failing `node:test` first, then implement.
- Update [PROGRESS.md](PROGRESS.md) as you complete tasks and whenever the discovery spike reveals a
  schema fact.
- Full branching & commit conventions: [.claude/workflow.md](.claude/workflow.md).
- Hard rules checklist: [.claude/rules.md](.claude/rules.md).

## Project agents & skills

Use the project agents in `.claude/agents/` for repeatable jobs:

- **schema-investigator** — runs the Slice 1 discovery spike against a real transcript.
- **slice-implementer** — implements a slice end-to-end under TDD and the verify gate.
- **metric-author** — adds a new metric module (one file + one registry entry).

Reference skills in `.claude/skills/` for repo conventions and the (discovered) transcript schema.

## Harness assets & session loop

This repo is wired as a self-enforcing harness (per *Learn Harness Engineering*). Every session
follows: **init → pick one feature → TDD → verify → update state → clean handoff.** See the
`harness-workflow` skill (`.claude/skills/harness-workflow/SKILL.md`) for the full loop.

| Asset | Path | Purpose |
|---|---|---|
| Initialization | [init.ps1](init.ps1) / [init.sh](init.sh) | Confirm a green baseline before any work (lecture-06). |
| Feature tracker | [feature_list.json](feature_list.json) | One feature `in_progress` at a time; evidence required to mark `passing` (lecture-08). |
| Hooks (guardrails) | [.claude/settings.json](.claude/settings.json), `.claude/hooks/*.mjs` | no-network guard, no-raw-transcript guard, verify-on-stop, tool-use log, session-start. |
| Dev-time MCP | [.mcp.json](.mcp.json) | `filesystem` + `git` servers — **harness only**, never imported by the product. |
| LSP | [jsconfig.json](jsconfig.json) | `typescript-language-server` semantic nav over the JS sources (cf. BR-04). |
| Plugin | [.claude-plugin/plugin.json](.claude-plugin/plugin.json) | Packages the agents + hooks + MCP as an installable local plugin. |
| Evaluator | [docs/harness/evaluator-rubric.md](docs/harness/evaluator-rubric.md) | Score agent output quality per session/slice (lecture-09). |
| Clean state | [docs/harness/clean-state-checklist.md](docs/harness/clean-state-checklist.md) | End-of-session checklist (lecture-12). |
| Handoff | [docs/harness/session-handoff.md](docs/harness/session-handoff.md) | Compact next-session pickup note (lecture-05). |

> **MCP/LSP are author-side conveniences only.** The shipped tool (`src/`, `bin/`) must remain
> no-network and zero-dependency; it never imports or depends on these servers.

> **Two hook configs, kept in sync.** [.claude/settings.json](.claude/settings.json) wires the hooks
> for direct use (relative paths); [.claude/hooks/hooks.json](.claude/hooks/hooks.json) wires the same
> hooks for plugin distribution (`${CLAUDE_PLUGIN_ROOT}` paths). When you add, remove, or re-match a
> hook, update **both** files identically.

## Definition of Done (global)

A change is done when: the relevant slice DoD is met, `node --test` passes, the no-network check
passes, PROGRESS.md is updated, and the BRD trace IDs for the work are referenced in the commit/PR.
