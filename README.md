# Glassbox

A local, read-only **Claude Code session observer**. Glassbox reads a Claude Code JSONL transcript
and renders a single self-contained HTML report with six behavioural metrics. It makes **no network
calls** and never controls the agent.

> Status: pre–Slice 0. The harness is in place; the product CLI and pipeline are built slice by
> slice (see [PROGRESS.md](PROGRESS.md) and [feature_list.json](feature_list.json)).

## What it measures

Grep-vs-semantic ratio, early-victory flag, verification density, overreach, continuity, and loop
detection — see [docs/Glassbox_BRD.md](docs/Glassbox_BRD.md) (BR-04…BR-09).

## Usage (target)

```sh
node bin/glassbox.js <transcript.jsonl>            # writes a self-contained HTML report
node bin/glassbox.js <transcript.jsonl> --json out.json
node bin/glassbox.js compare a.jsonl b.jsonl       # two-session comparison
```

Options: `--redact` (scrub seeded secrets), `--scope <glob>` (overreach scope), `--threshold <n>`
(loop-detection threshold).

## Develop

| Purpose | Windows | POSIX |
|---|---|---|
| Init / baseline | `pwsh ./init.ps1` | `./init.sh` |
| Verify gate | `pwsh ./verify.ps1` | `./verify.sh` |

The verify gate (`node --test` + a no-network import check) is the single source of truth for
"is it green?". Nothing merges to `main` unless it passes.

## Design rules

No build step, Node built-ins only, no network imports, a single normalization boundary
(`src/normalize.js`), strict layering, one metric per file, graceful degradation. Full details:
[CLAUDE.md](CLAUDE.md), [.claude/rules.md](.claude/rules.md), and
[docs/Glassbox_TSD.md](docs/Glassbox_TSD.md).

Built under its own harness, per
[Learn Harness Engineering](https://walkinglabs.github.io/learn-harness-engineering/en/).