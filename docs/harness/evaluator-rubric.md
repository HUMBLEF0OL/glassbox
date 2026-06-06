# Evaluator Rubric — Glassbox

> Scorecard for reviewing the quality of an agent's work on Glassbox. Score after a session or at a
> slice boundary. Based on walkinglabs Learn Harness Engineering. Each dimension is scored **0–2**
> (0 = absent, 1 = partial, 2 = solid). Be specific; cite files and verify output.
>
> **Note:** agents are poor self-judges out of the box. Compare these scores against human judgment
> and tighten the pass/fail criteria over 3–5 tuning rounds. Record each change.

## Dimensions

| # | Dimension | 0 | 1 | 2 |
|---|---|---|---|---|
| 1 | **Correctness** | Behaviour does not match the slice DoD / BRD trace IDs. | Mostly matches; minor gaps. | Matches the DoD and the cited BR/AC IDs exactly. |
| 2 | **Verification** | `verify.*` not run, or run red and ignored. | Tests run but evidence not recorded in `feature_list.json`. | `node --test` + no-network grep green; evidence recorded. |
| 3 | **Scope discipline** | Edited files unrelated to the selected feature. | One small unrelated change. | Stayed within the one `in_progress` feature (no overreach, BR-07). |
| 4 | **Reliability** | Result breaks on re-run / fresh checkout. | Works but depends on uncommitted local state. | Survives `init.*` + `verify.*` from a clean tree. |
| 5 | **Maintainability** | Violates conventions (deps, layering, normalize boundary). | Conventions mostly followed. | ESM, zero-dep, single boundary, one-metric-per-file all honoured. |
| 6 | **Handoff readiness** | `PROGRESS.md` / `feature_list.json` stale. | Updated but `session-handoff.md` missing. | State files + handoff updated; next session can continue from repo alone. |

**Max score: 12.**

## Glassbox-specific hard fails (any one ⇒ Block)

- A `http`/`https`/`net`/`dns` import exists under `src/` or `bin/` (NFR-01, AC-11).
- A raw (unsanitized) transcript was committed outside `test/fixtures/` (RSK-04).
- A third-party runtime dependency was added without NFR-03 justification.
- A build/transpile step was introduced (NFR-02, CON-04).
- Raw-schema knowledge leaked outside `src/normalize.js` (RSK-01).

## Conclusion

- **Accept** — meets the bar (no hard fail; score ≥ 10 with Verification = 2).
- **Revise** — fixable gaps (score 6–9, or Verification < 2).
- **Block** — any hard fail, or score ≤ 5.

## Tuning log

| Round | Date | Change to rubric | Why |
|---|---|---|---|
| _init_ | — | Initial rubric. | — |
