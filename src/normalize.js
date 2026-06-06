/**
 * src/normalize.js — raw transcript record → normalized Event[] (Slice 1).
 *
 * THIS IS THE SINGLE NORMALIZATION BOUNDARY (RSK-01).
 * All knowledge of the raw Claude Code JSONL schema lives here and nowhere else.
 * Downstream code consumes Event objects only.
 *
 * Confirmed raw schema (discovery spike, 2026-06-06):
 *   - Transcript path: ~/.claude/projects/<project-slug>/*.jsonl
 *   - File format: one JSON object per line (JSONL)
 *   - Record types (top-level `type` field):
 *       'user'           — human turn OR tool result
 *       'assistant'      — model turn (may contain tool_use blocks)
 *       'attachment'     — hook/sidebar attachment (skip)
 *       'queue-operation'— internal queue state (skip)
 *       'file-history-snapshot' — skip
 *       'last-prompt'    — skip
 *       'system'         — system prompt injection (keep as 'system')
 *   - Timestamp field: top-level `timestamp` (ISO 8601 string)
 *   - User messages: record.type='user', record.message.content = [{type:'text',text:...}]
 *   - Tool results:  record.type='user', record.toolUseResult = {...}, record.sourceToolAssistantUUID
 *   - Assistant text: record.type='assistant', record.message.content includes {type:'text',text:...}
 *   - Tool calls:    record.type='assistant', record.message.content includes {type:'tool_use',id,name,input}
 *   - Tool names observed: Bash, Edit, Glob, Grep, PowerShell, Read, Skill, TodoWrite, ToolSearch, Write
 *   - No LSP/semantic tool names observed on this machine (ASM-04 — text-search-only mode for BR-04)
 *
 * Trace: BR-01, BR-02, BR-13, RSK-01, NFR-05
 */

/**
 * @typedef {Object} ToolCall
 * @property {string}  id      - Tool use ID (from tool_use block id field)
 * @property {string}  name    - Tool name (e.g. 'Read', 'Bash', 'Edit')
 * @property {Object}  input   - Raw input parameters
 * @property {string}  [caller]
 */

/**
 * @typedef {Object} ToolResult
 * @property {string}  toolUseId        - Correlates to ToolCall.id (from tool_use block in assistant)
 * @property {string}  assistantUuid    - UUID of the assistant record that made the call
 * @property {Object}  raw              - Raw toolUseResult object
 * @property {boolean|null} ok          - Success signal (null if undeterminable)
 */

/**
 * @typedef {Object} Event
 * @property {number}          seq        - 0-based monotonic sequence number
 * @property {string}          type       - 'user'|'assistant'|'tool_call'|'tool_result'|'system'|'unknown'
 * @property {string|null}     ts         - ISO timestamp string or null
 * @property {string}          uuid       - Record UUID
 * @property {string|null}     text       - Text content (user/assistant text events)
 * @property {ToolCall|null}   tool       - Tool call data (tool_call events)
 * @property {ToolResult|null} result     - Tool result data (tool_result events)
 * @property {string[]}        warnings   - Non-fatal schema anomalies
 * @property {Object}          raw        - Original record (for debugging only — do not use for behaviour)
 */

/**
 * Extract a timestamp from a record, trying multiple field names.
 * Returns null + a warning if none found (BR-13).
 * @param {Object} record
 * @returns {{ ts: string|null, warning: string|null }}
 */
function extractTs(record) {
  const ts = record.timestamp ?? record.ts ?? record.created_at ?? null;
  if (!ts) return { ts: null, warning: 'missing timestamp field' };
  return { ts: String(ts), warning: null };
}

/**
 * Derive the success signal from a tool result record (Open Question 4).
 * Returns true/false/null (null = undeterminable).
 * Bash/PowerShell: check for error keywords in stdout/stderr since no exitCode in raw result.
 * Edit/Write/Read: no error field → assume ok unless we detect explicit failure signals.
 *
 * @param {Object} toolUseResult
 * @returns {boolean|null}
 */
function deriveOk(toolUseResult) {
  if (!toolUseResult || typeof toolUseResult !== 'object') return null;

  const { stdout = '', stderr = '', interrupted, isError } = toolUseResult;

  // Explicit error flag (MCP tools sometimes set this)
  if (typeof isError === 'boolean') return !isError;

  // Shell tools: interrupted = failure
  if (interrupted === true) return false;

  // Shell tools: check stdout/stderr for failure keywords
  if (typeof stdout === 'string' || typeof stderr === 'string') {
    const combined = `${stdout}\n${stderr}`.toLowerCase();
    if (/\b(error|exception|fail(ed|ure)?|fatal|abort|cannot|could not)\b/.test(combined)) {
      return false;
    }
    return true;
  }

  // For structured results (Read, Edit, Glob) — no error signal → assume ok
  return true;
}

/**
 * Convert raw transcript records to a normalized Event array.
 * A single assistant record containing multiple tool_use blocks is expanded into
 * one 'assistant' text event (if text present) + one 'tool_call' event per block.
 *
 * @param {Object[]} records - Parsed JSON objects from streamLines()
 * @returns {Event[]}
 */
export function toEvents(records) {
  /** @type {Event[]} */
  const events = [];
  let seq = 0;

  for (const record of records) {
    const type = record.type ?? '';
    const { ts, warning: tsWarn } = extractTs(record);

    // Skip harness / queue records — not meaningful for session analysis
    if (['queue-operation', 'attachment', 'file-history-snapshot', 'last-prompt'].includes(type)) {
      continue;
    }

    if (type === 'system') {
      events.push({
        seq: seq++, type: 'system', ts,
        uuid: record.uuid ?? '',
        text: record.content ?? null,
        tool: null, result: null,
        warnings: tsWarn ? [tsWarn] : [],
        raw: record,
      });
      continue;
    }

    if (type === 'user') {
      const warnings = tsWarn ? [tsWarn] : [];

      // Tool result: has toolUseResult field
      if ('toolUseResult' in record) {
        const rawResult = record.toolUseResult;
        const ok = deriveOk(rawResult);
        events.push({
          seq: seq++, type: 'tool_result', ts,
          uuid: record.uuid ?? '',
          text: null,
          tool: null,
          result: {
            toolUseId: null,            // populated by correlateResults() (block id of the originating call)
            assistantUuid: record.sourceToolAssistantUUID ?? null,
            raw: rawResult,
            ok,
          },
          warnings,
          raw: record,
        });
        continue;
      }

      // User message: has message.content
      const content = record.message?.content ?? '';
      let text = null;
      if (typeof content === 'string') {
        text = content;
      } else if (Array.isArray(content)) {
        text = content
          .filter(b => b?.type === 'text')
          .map(b => b.text ?? '')
          .join('\n') || null;
      }

      events.push({
        seq: seq++, type: 'user', ts,
        uuid: record.uuid ?? '',
        text,
        tool: null, result: null,
        warnings,
        raw: record,
      });
      continue;
    }

    if (type === 'assistant') {
      const warnings = tsWarn ? [tsWarn] : [];
      const content = record.message?.content;

      if (!Array.isArray(content)) {
        // Unexpected shape — emit as unknown
        warnings.push('assistant record has no content array');
        events.push({
          seq: seq++, type: 'unknown', ts,
          uuid: record.uuid ?? '',
          text: null, tool: null, result: null,
          warnings,
          raw: record,
        });
        continue;
      }

      // Collect text blocks and tool_use blocks separately
      const textBlocks = content.filter(b => b?.type === 'text');
      const toolUseBlocks = content.filter(b => b?.type === 'tool_use');
      // thinking blocks are intentionally skipped

      // Emit a text event if there is any text content
      if (textBlocks.length > 0) {
        const text = textBlocks.map(b => b.text ?? '').join('\n');
        events.push({
          seq: seq++, type: 'assistant', ts,
          uuid: record.uuid ?? '',
          text,
          tool: null, result: null,
          warnings: [...warnings],
          raw: record,
        });
      }

      // Emit one tool_call event per tool_use block (preserving monotonic seq)
      for (const blk of toolUseBlocks) {
        events.push({
          seq: seq++, type: 'tool_call', ts,
          uuid: record.uuid ?? '',
          text: null,
          tool: {
            id: blk.id ?? null,
            name: blk.name ?? 'unknown',
            input: blk.input ?? {},
            caller: blk.caller ?? null,
            // category / targets / command filled by classify.js
            category: 'unknown',
            targets: [],
            command: null,
          },
          result: null,
          warnings: [...warnings],
          raw: record,
        });
      }

      // Edge case: assistant record with only thinking blocks (no text, no tools)
      if (textBlocks.length === 0 && toolUseBlocks.length === 0) {
        events.push({
          seq: seq++, type: 'assistant', ts,
          uuid: record.uuid ?? '',
          text: null, tool: null, result: null,
          warnings: [...warnings, 'assistant record has only thinking blocks or empty content'],
          raw: record,
        });
      }
      continue;
    }

    // Unknown record type — degrade gracefully (BR-13)
    events.push({
      seq: seq++, type: 'unknown', ts,
      uuid: record.uuid ?? '',
      text: null, tool: null, result: null,
      warnings: [`unknown record type: ${type}`],
      raw: record,
    });
  }

  correlateResults(events);
  return events;
}

/**
 * Assign each tool_result its originating tool_call's block id (`result.toolUseId`).
 *
 * The raw result record only carries `sourceToolAssistantUUID` (the assistant *record*
 * uuid), not a per-block tool-use id. When one assistant record emits multiple tool_use
 * blocks they all share that record uuid, so a uuid-only correlation cannot tell the
 * blocks apart. Here we pair results to calls by assistant uuid **in arrival order**
 * (results are returned in block order), giving each result the unique block id of its
 * call. Downstream code can then correlate precisely on `tool.id === result.toolUseId`.
 *
 * @param {Event[]} events
 */
function correlateResults(events) {
  /** @type {Map<string, Event[]>} assistant uuid → tool_call events in seq order */
  const callsByAssistant = new Map();
  for (const ev of events) {
    if (ev.type !== 'tool_call') continue;
    const list = callsByAssistant.get(ev.uuid) ?? [];
    list.push(ev);
    callsByAssistant.set(ev.uuid, list);
  }

  /** @type {Map<string, number>} assistant uuid → next unconsumed call index */
  const consumed = new Map();
  for (const ev of events) {
    if (ev.type !== 'tool_result' || !ev.result) continue;
    const aUuid = ev.result.assistantUuid;
    if (aUuid == null) continue;
    const calls = callsByAssistant.get(aUuid);
    if (!calls || calls.length === 0) continue;
    const idx = consumed.get(aUuid) ?? 0;
    const call = calls[idx];
    if (!call) continue;
    ev.result.toolUseId = call.tool?.id ?? null;
    consumed.set(aUuid, idx + 1);
  }
}
