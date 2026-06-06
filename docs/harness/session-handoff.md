# Session Handoff — Glassbox

> Compact handoff note between sessions. Fill this in at the end of each session (walkinglabs
> session-handoff template). Keep it short and factual; the next session reads this first.

## Currently verified

- **State:** _what is confirmed working, and the exact verification run (e.g. `verify.ps1` → PASS)._
- **Current slice:** _e.g. Slice 0 — Harness & Project Skeleton._

## Changes this session

- _Code / infrastructure that changed (files, why). Reference BR/AC/NFR trace IDs._

## Still broken or unverified

- _Known issues, risky areas, anything not yet verified._

## Next best action

- _What the next session should do first, and what NOT to touch._

## Commands

| Purpose | Command |
|---|---|
| Init / baseline | `pwsh ./init.ps1` · `./init.sh` |
| Verify (the gate) | `pwsh ./verify.ps1` · `./verify.sh` |
| Run the tool | `node bin/glassbox.js --help` |
| Tool-use log | `Get-Content .claude/logs/tool-use.jsonl -Tail 20` |

---

## Log

> Newest entry on top. One block per session.

### _YYYY-MM-DD — session title_

- Verified: _…_
- Changed: _…_
- Still open: _…_
- Next: _…_
