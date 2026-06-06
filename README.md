# Glassbox

A local, read-only **Claude Code session observer**. Glassbox reads a Claude Code JSONL transcript
and renders a single self-contained HTML report with six behavioural metrics. It makes **no network
calls** and never controls the agent.

> Status: **v1.0.0 — feature complete.** All six slices implemented and verified.

## What it measures

Grep-vs-semantic ratio, early-victory flag, verification density, overreach, continuity, and loop
detection — see [docs/Glassbox_BRD.md](docs/Glassbox_BRD.md) (BR-04…BR-09).

## Usage

```sh
# Single session report
node bin/glassbox.js <transcript.jsonl>

# Auto-discover latest transcript
node bin/glassbox.js --latest

# Export normalized events as JSON
node bin/glassbox.js <transcript.jsonl> --json out.json

# Two-session comparison
node bin/glassbox.js compare a.jsonl b.jsonl

# With options
node bin/glassbox.js <transcript.jsonl> \
  --out report.html          # output path (default: ./glassbox-report.html)
  --redact                   # scrub secrets from the report
  --scope "src/**"           # overreach scope glob (repeatable)
  --threshold 3              # loop-detection repeat threshold
  --open                     # open report in browser after writing
```

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