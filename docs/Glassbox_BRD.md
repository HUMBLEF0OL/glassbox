# Business Requirements Document — Glassbox

*A Claude Code session observer that makes agent behaviour visible and measurable.*

## Document Control

| Field | Value |
|---|---|
| Document title | Glassbox — Business Requirements Document |
| Version | 1.0 (post-audit) |
| Status | Draft for review |
| Date | 6 June 2026 |
| Author | Project Owner |
| Reviewers | Project Owner (self-review) |
| Related documents | *Harness engineering* course notes; Claude Code workflows docs; LSP-in-Claude-Code article (K. Bansal, 28 Feb 2026) |

| Version | Date | Change |
|---|---|---|
| 0.1 | 6 Jun 2026 | Initial draft |
| 1.0 | 6 Jun 2026 | Post-audit revision: added out-of-scope, privacy/security NFR, acceptance criteria, requirement IDs, document control, cross-platform constraint, schema-drift risk; demoted unverified facts to assumptions |

---

## 1. Executive Summary

Glassbox is a small, dependency-light tool that ingests a Claude Code session transcript and produces two things: a **timeline** of what the coding agent did during the session, and a **scorecard** that grades the session against known agent-reliability failure modes (overreaching on scope, declaring a task complete without verifying it, losing continuity across sessions, and navigating code by text search rather than semantic lookup).

The purpose is to turn abstract "harness health" concepts into concrete, observable measurements on the user's own sessions, so that improvements to instruction files, verification steps, and tooling can be validated rather than guessed at. Glassbox is intended as a durable personal tool that runs against every future session, and as a practical exercise in building a tool *under* a minimal harness.

## 2. Background & Problem Statement

When a coding agent works inside a repository, most of its behaviour is invisible after the fact. The session scrolls past, and the only durable artifact is the diff. This makes it hard to answer questions that matter for reliability: *Did the agent verify its work before claiming it was done? Did it stay within the intended scope? Did it read the project's state before starting? Did it use semantic code navigation or fall back to text search?*

These failure modes are well documented in harness-engineering material, but they remain abstract until observed on real sessions. Without measurement, any change to instruction files or workflow is a guess. Glassbox closes that loop by parsing the session transcript the agent already produces and surfacing the relevant signals.

## 3. Business Objectives & Success Metrics

| ID | Objective | Success metric |
|---|---|---|
| OBJ-1 | Make agent session behaviour observable after the fact | A user can open a readable report for any past session in one command |
| OBJ-2 | Quantify harness-health failure modes | The scorecard reports all six metrics (Section 6) with defined, repeatable calculations |
| OBJ-3 | Enable before/after comparison of harness changes | Two sessions can be compared on the same metrics to show the effect of an instruction-file or workflow change |
| OBJ-4 | Produce a durable, reusable tool | The tool runs on the user's machine without a build step and works on later sessions without modification |
| OBJ-5 | Practise the harness loop | The tool is itself built under a minimal harness (instruction file, feature list, progress/state file, verify command) |

## 4. Scope

### 4.1 In Scope

- Parsing a single Claude Code session transcript (JSONL) into a normalized event stream.
- Computing the six scorecard metrics defined in Section 6.
- Rendering a single self-contained HTML report containing a timeline and scorecard.
- A command-line entry point that accepts a transcript path and opens/writes the report.
- Comparing two sessions on the same metrics (basic side-by-side).

### 4.2 Out of Scope

- Real-time/live observation of an in-progress session (Glassbox operates on completed transcripts).
- Modifying, steering, or controlling the agent (Glassbox is read-only and passive).
- Any hosted/multi-user service, authentication, or cloud storage.
- Support for transcripts from tools other than Claude Code.
- Long-term storage, databases, or analytics across many sessions (a possible later extension, explicitly excluded from this release).
- Recommendations or auto-remediation of detected issues (report only).

## 5. Stakeholders

| Stakeholder | Role | Interest |
|---|---|---|
| Project Owner | Sole developer, primary user | Build the tool; use it to evaluate own sessions |
| Future self / other Claude Code users | Potential secondary users | Reuse the tool on their own sessions (not a release target for v1.0) |

## 6. Business Requirements

Functional capability requirements, at the business level. Detailed metric definitions are operationalized in the Acceptance Criteria (Section 12).

| ID | Requirement |
|---|---|
| BR-01 | The system shall locate and read a Claude Code session transcript in JSONL form. |
| BR-02 | The system shall parse the transcript into a normalized event stream (user messages, assistant messages, tool calls, tool results, timestamps). |
| BR-03 | The system shall produce a chronological timeline of agent actions. |
| BR-04 | The system shall compute a **grep-vs-semantic ratio**: the proportion of code-navigation actions performed via text search tools versus semantic/LSP operations. |
| BR-05 | The system shall compute an **early-victory flag**: whether the agent claimed completion without a successful verification step afterward. |
| BR-06 | The system shall compute a **verification density**: the number of edits per successful test/lint/build invocation. |
| BR-07 | The system shall compute an **overreach** measure: files changed during a task relative to the task's intended scope. |
| BR-08 | The system shall compute a **continuity check**: whether the session read the project's progress/state file before performing work. |
| BR-09 | The system shall compute a **loop-detection** signal: repeated identical tool calls or repeated edits to the same target. |
| BR-10 | The system shall render the timeline and scorecard as a single self-contained HTML report. |
| BR-11 | The system shall expose a command-line interface that accepts a transcript path and produces the report. |
| BR-12 | The system shall allow two sessions to be compared on the same metrics. |
| BR-13 | The system shall degrade gracefully when an expected field, tool type, or metric input is absent (report "unknown" rather than failing). |

## 7. Non-Functional Requirements

| ID | Category | Requirement |
|---|---|---|
| NFR-01 | Privacy & security | Glassbox shall operate entirely locally and make no network requests. Transcripts may contain source code, file contents, secrets, and API keys; the tool shall not transmit data off the machine, and shall provide an option to redact obvious secret patterns from the rendered report. |
| NFR-02 | Portability | The tool shall run on the user's primary OS without a build/compile step, using a current Node.js runtime. Transcript-location logic shall account for OS-specific paths (see Constraints). |
| NFR-03 | Dependency minimalism | The tool shall keep third-party dependencies to a minimum so it remains maintainable and durable across Node and Claude Code updates. |
| NFR-04 | Performance | A typical single-session report shall be generated in a few seconds on a normal developer laptop. |
| NFR-05 | Robustness | Parsing shall not crash on malformed, partial, or unexpected lines; bad lines shall be skipped and counted. |
| NFR-06 | Maintainability | The codebase shall be small and readable, with metric logic separated from parsing and rendering, so new metrics can be added as discrete units. |
| NFR-07 | Usability | The report shall be understandable without reading the source code; metrics shall be labelled and briefly explained in the report itself. |

## 8. Assumptions

| ID | Assumption | Verification action |
|---|---|---|
| ASM-01 | Claude Code persists completed session transcripts to disk in JSONL form, one event per line. | Confirm during initial log discovery; the build's first task is to locate and inventory real logs. |
| ASM-02 | Transcripts are stored under the user's Claude Code config directory (reported elsewhere as a per-project path); the exact layout is **not officially documented**. | Confirm the real path and structure on the user's machine before relying on it. |
| ASM-03 | Each event carries enough structure (tool name, inputs, results, timestamps) to derive the six metrics. | Confirm field availability during discovery; adjust metric definitions to available fields. |
| ASM-04 | Semantic/LSP navigation is enabled in the user's Claude Code setup, so the grep-vs-semantic ratio is meaningful. | If LSP is not enabled, BR-04 reports text-search usage only and notes the absence. |
| ASM-05 | Reported LSP performance figures (e.g. sub-second semantic lookup vs. multi-second text search) are indicative, sourced from a third-party article, and are **not** independently verified; they are context, not requirements. | None required — not a measured target. |

## 9. Constraints

| ID | Constraint |
|---|---|
| CON-01 | The transcript format is an undocumented internal of Claude Code and may differ by version or platform; Glassbox depends on reverse-engineered structure. |
| CON-02 | Transcript file locations differ across operating systems (e.g. macOS/Linux home-directory config paths vs. Windows equivalents); path resolution must handle this. |
| CON-03 | Delivery target is a single weekend; scope is bounded accordingly (single-tool focus, no service infrastructure). |
| CON-04 | Implementation language is JavaScript/Node by preference. |

## 10. Dependencies

| ID | Dependency |
|---|---|
| DEP-01 | A current Node.js runtime on the user's machine. |
| DEP-02 | Access to real Claude Code session transcripts to develop and validate against. |
| DEP-03 | For the grep-vs-semantic metric to be meaningful, semantic/LSP tooling must be enabled in Claude Code. This currently relies on a community-discovered, undocumented enablement flag that may change. |

## 11. Risks & Mitigations

| ID | Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|---|
| RSK-01 | Transcript schema changes in a future Claude Code release, breaking the parser. | Medium | Medium | Isolate parsing behind a single normalization layer; skip unknown fields; version-tag parsing assumptions. |
| RSK-02 | Real transcript structure differs materially from assumptions, invalidating metric definitions. | Medium | High | Make log discovery the first task; define metrics only against fields confirmed to exist. |
| RSK-03 | The undocumented LSP flag is removed or renamed, so the grep-vs-semantic metric loses its basis. | Low | Low | Treat the metric as "best-effort"; report text-search usage even when semantic data is absent. |
| RSK-04 | Rendered report leaks secrets present in transcripts. | Medium | High | Local-only operation (NFR-01); optional secret redaction; warn the user that reports may contain sensitive content. |
| RSK-05 | Scope creep beyond a weekend (e.g. multi-session analytics, storage). | Medium | Medium | Out-of-scope section is explicit; treat extensions as separate work. |

## 12. Acceptance Criteria

| ID | Traces to | Criterion |
|---|---|---|
| AC-01 | BR-01, BR-02 | Given a real session transcript, the tool parses it into a normalized event stream and reports counts of each event type without crashing. |
| AC-02 | BR-03, BR-10 | The HTML report shows a chronological, readable timeline of the session's actions. |
| AC-03 | BR-04 | The report states the number of text-search navigation actions and the number of semantic-navigation actions, and the ratio between them. |
| AC-04 | BR-05 | The early-victory flag is raised when the assistant claims completion (e.g. "done"/"complete") and no successful test/build/lint result occurs after the agent's final edit; otherwise it is not raised. |
| AC-05 | BR-06 | Verification density is reported as edits divided by successful verification invocations, with both counts shown. |
| AC-06 | BR-07 | Overreach is reported as the count of distinct files changed in a task; where an intended scope is available, the report flags files changed outside it. |
| AC-07 | BR-08 | The continuity check reports whether a progress/state file was read before the first edit of the session. |
| AC-08 | BR-09 | The loop-detection signal flags any identical tool call repeated beyond a defined threshold, or repeated edits to the same target. |
| AC-09 | BR-11 | A single command, given a transcript path, produces the report. |
| AC-10 | BR-12 | Two sessions can be rendered side by side on the same six metrics. |
| AC-11 | NFR-01 | The tool makes no outbound network connections during operation (verifiable by inspection). |
| AC-12 | BR-13, NFR-05 | When fed a transcript with malformed or missing lines, the tool completes, skips the bad lines, and reports how many were skipped. |

## 13. Glossary

| Term | Definition |
|---|---|
| Session transcript | The on-disk record a coding agent produces for a working session, here assumed to be JSONL (one event per line). |
| Harness | The working environment around a coding agent — instruction files, state files, verification steps, and controls — that makes its behaviour reliable. |
| Scorecard | Glassbox's summary of harness-health metrics for a session. |
| Semantic / LSP navigation | Code lookup that uses language-server operations (definition, references, type info) rather than text search. |
| Early victory | An agent claiming a task is complete without a passing verification step afterward. |
| Overreach | An agent changing more of the codebase than the task intended. |
| Continuity | Whether a session picks up prior state rather than starting cold. |

## 14. Open Questions / To Verify

1. What is the exact on-disk location and JSONL schema of Claude Code session transcripts on the user's OS? (ASM-02, ASM-03)
2. Is semantic/LSP usage distinguishable in the transcript from ordinary text search? (BR-04, ASM-04)
3. Do transcripts record enough about an intended task scope to compute overreach reliably, or must scope be supplied separately? (BR-07)
4. What is the most reliable cross-tool signal for a passing verification — exit code, the `isError` flag, or output text patterns? Refine `successOf` once real results are observed.
5. Should the report support exporting the normalized event stream as JSON for reuse by other tools? Resolved in Slice 1: included as the `--json <file>` flag (Plan task 1.12, satisfies AC-01 early).

---

## Appendix A — Audit Log

This document was generated, then audited for completeness and correctness; findings were resolved in version 1.0.

| # | Finding | Type | Resolution |
|---|---|---|---|
| 1 | Transcript path and LSP performance numbers were stated as established fact, though sourced from undocumented internals and a single third-party article. | Correctness | Demoted to labelled assumptions (ASM-02, ASM-05) with verification actions. |
| 2 | The grep-vs-semantic metric silently depended on an undocumented, community-discovered enablement flag. | Correctness | Made an explicit dependency (DEP-03) and risk (RSK-03). |
| 3 | Key metrics ("early victory", "overreach") were not operationally defined. | Correctness | Defined as testable acceptance criteria (AC-04, AC-06). |
| 4 | No out-of-scope section. | Completeness | Added (Section 4.2). |
| 5 | No privacy/security treatment, despite transcripts potentially containing secrets and the tool rendering them to HTML. | Completeness | Added NFR-01 and RSK-04. |
| 6 | No acceptance criteria, requirement IDs, or traceability. | Completeness | Added requirement IDs (BR/NFR), acceptance criteria (Section 12) traced to requirements. |
| 7 | No document-control/versioning block. | Completeness | Added Document Control. |
| 8 | Cross-platform transcript paths and schema-drift risk unaddressed. | Completeness | Added CON-02 and RSK-01. |
| 9 | Input scope (single file vs. directory) ambiguous. | Completeness | Pinned to single-transcript input in scope; multi-session analytics explicitly out of scope. |
| 10 | No graceful-degradation requirement for missing/malformed data. | Completeness | Added BR-13, NFR-05, AC-12. |
