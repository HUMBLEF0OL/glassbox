# Glassbox

A local, read-only **Claude Code session observer**. Glassbox reads a Claude Code JSONL transcript
and renders a single self-contained HTML report with six behavioural metrics. It makes **no network
calls** and never controls the agent.

> Status: **v1.0.0 — feature complete.** All six slices implemented and verified.

## What it measures

Grep-vs-semantic ratio, early-victory flag, verification density, overreach, continuity, and loop
detection (BR-04…BR-09 in the project's internal requirements doc).

## Install

Glassbox is zero-dependency, plain ESM, and has no build step — npm can install it straight
from this GitHub repo, no published registry package needed:

```sh
# Latest master, as a global `glassbox` command
npm install -g github:HUMBLEF0OL/glassbox

# Pinned to a release tag (recommended for stability)
npm install -g github:HUMBLEF0OL/glassbox#v1.0.0

# Or run it once without installing
npx github:HUMBLEF0OL/glassbox --latest
```

Once installed globally, replace `node bin/glassbox.js` with `glassbox` in any command below.

## Finding a transcript to analyze

Glassbox needs a Claude Code session transcript (`.jsonl`). Claude Code writes one append-only
file per session under:

```
~/.claude/projects/<project-slug>/<session-id>.jsonl
```

(On Windows, Glassbox also checks `%APPDATA%\Claude\projects\...`; on POSIX it also checks
`~/.config/claude/projects/...` and `$XDG_CONFIG_HOME/claude/projects/...`.)

- **`<project-slug>`** is derived from the project's working-directory path, with separators,
  colons, and spaces replaced by dashes — e.g. `e:\Projects and Learning\glassbox` becomes
  `e--Projects-and-Learning-glassbox`.
- **`<session-id>`** is a UUID; one file per session, growing as the session continues. The most
  recently modified file in a project's folder is its latest session.

You don't have to hunt these down by hand — `--latest` searches every known root on the machine
and picks the newest `.jsonl` overall:

```sh
glassbox --latest
```

To analyze a specific past session instead, open `~/.claude/projects/<your-project-slug>/`, find
the file by its modified date (or session UUID, if you know it from `claude --resume` / your IDE),
and pass its path directly:

```sh
glassbox ~/.claude/projects/e--Projects-and-Learning-glassbox/<session-id>.jsonl
```

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
[CLAUDE.md](CLAUDE.md) and [.claude/rules.md](.claude/rules.md).

Built under its own harness, per
[Learn Harness Engineering](https://walkinglabs.github.io/learn-harness-engineering/en/).