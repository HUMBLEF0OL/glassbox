# Clean-State Checklist — Glassbox

> Run through this before ending any session so the next session starts cleanly (walkinglabs
> "Every session must leave a clean state", lecture-12; OBJ-5). The agent should treat this as part
> of its end-of-session routine.

## Checklist

- [ ] **Startup still works:** `node bin/glassbox.js --help` runs (or `init.*` passes pre-Slice-0).
- [ ] **Verify is green:** `pwsh ./verify.ps1` (Windows) / `./verify.sh` (POSIX) passes —
      `node --test` **and** the no-network grep.
- [ ] **No network imports** added under `src/` or `bin/` (NFR-01, AC-11).
- [ ] **No raw transcripts** committed; only sanitized fixtures under `test/fixtures/` (RSK-04).
- [ ] **No new runtime dependency** without NFR-03 justification; `package.json` `dependencies` empty.
- [ ] **PROGRESS.md updated:** slice status + any newly confirmed schema facts.
- [ ] **feature_list.json reflects reality:** at most one `in_progress`; no false `passing`; `evidence`
      filled for anything marked `passing`.
- [ ] **session-handoff.md updated** with next best action.
- [ ] **No half-finished work** left unrecorded (note WIP in the handoff if unavoidable).
- [ ] **Git state tidy:** intended changes staged/committed with Conventional Commits + trace IDs;
      `.claude/logs/` and report HTML are ignored, not committed.
- [ ] **Next session can continue** using only repo artifacts (no undocumented local state).
