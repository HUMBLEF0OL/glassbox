---
name: transcript-schema
description: Reference for the Claude Code JSONL transcript schema as consumed by Glassbox — the normalized Event model and the (to-be-confirmed) raw field mapping. Read when working on discover.js, read.js, normalize.js, or classify.js. Update the "Confirmed raw schema" section after the Slice 1 discovery spike.
---

# Transcript Schema Reference

> The **normalized model is the contract**. The raw schema below is reverse-engineered and gets
> confirmed by the discovery spike (see [PROGRESS.md](../../../PROGRESS.md)). Until confirmed,
> treat raw fields as best-effort and degrade gracefully.

## Normalized `Event` (the contract — TSD §3.1)

```
Event {
  seq        number        // monotonic 0-based, arrival order
  ts         ?string       // ISO-8601 or null
  type       'user' | 'assistant' | 'tool_call' | 'tool_result' | 'system' | 'unknown'
  text       ?string       // message text for user/assistant
  tool       ?ToolCall     // when type === 'tool_call'
  result     ?ToolResult   // when type === 'tool_result'
  toolUseId  ?string       // correlates result -> call
  raw        object        // original parsed JSON (debugging only)
  warnings   string[]      // non-fatal normalization notes
}

ToolCall   { name, category, input, targets[], command? }
ToolResult { ok?, exitCode?, text, isError }
```

`ToolCategory`: `search | semantic | edit | verify | read | other | unknown`.

## Normalization rules

- **Type inference order:** explicit role/type field → tool-use block present → tool-result block
  present → fallback `unknown` (+warning).
- **One raw record may expand into multiple Events:** an assistant record with text *and* tool-use
  blocks becomes an assistant-text Event followed by one `tool_call` Event per block, preserving
  `seq`. Required for accurate metric counting.
- **Timestamp:** read from `timestamp` / `ts` / `created_at`; null if none.
- **Correlation:** match `tool_result` to its `tool_call` via `toolUseId` when present.
- All schema knowledge stays in `normalize.js`.

## Classification (TSD §4)

- Name table first (lowercased, MCP prefixes stripped), exact → regex fallback.
- `verify` via command sniffing on shell runners (`npm/pnpm/yarn (run) test|lint|build`,
  `pytest|jest|vitest|tsc|eslint|go test|cargo test|build`, `npx tsc|eslint|vitest|jest`).
- Target extraction from `input.path|file_path|filePath|targets[]|files[]` and `*path` fields;
  normalize to POSIX, make workspace-relative when root known.
- Semantic detection: names like `listcodeusages`, `*definition*`, `*references*`, `documentsymbol`,
  `workspacesymbol`, `hover`, `*lsp*`. If none ever appear → BR-04 runs text-search-only (ASM-04).

## Confirmed raw schema (fill after discovery spike)

| Concept | Raw field(s) | Confirmed? |
|---|---|---|
| record role/type | _TBD_ | ⬜ |
| tool name | _TBD_ | ⬜ |
| tool input | _TBD_ | ⬜ |
| tool result / success signal | _TBD_ | ⬜ |
| toolUseId correlation | _TBD_ | ⬜ |
| timestamp | _TBD_ | ⬜ |
| semantic tool names present | _TBD (or none → text-search-only)_ | ⬜ |
