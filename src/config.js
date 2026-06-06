/**
 * src/config.js — configuration data tables (Slice 1).
 * All pattern arrays and classification mappings live here so they can be re-tuned in one edit.
 *
 * Trace: TSD §4.2, RSK-01, NFR-03
 */

/**
 * Tool-name → category mapping.
 * Order matters: first match wins when using regex fallback.
 * Categories: read | edit | search | semantic | bash | mcp | meta | unknown
 *
 * Real tool names observed in glassbox transcripts (Slice 1 discovery spike):
 *   Bash, Edit, Glob, Grep, PowerShell, Read, Skill, TodoWrite, ToolSearch, Write
 */
export const CLASSIFICATION = {
  // Exact name → category
  exact: {
    Read:        'read',
    Write:       'edit',
    Edit:        'edit',
    MultiEdit:   'edit',
    Glob:        'search',
    Grep:        'search',
    Bash:        'bash',
    PowerShell:  'bash',
    // Meta / harness tools
    Skill:       'meta',
    TodoWrite:   'meta',
    ToolSearch:  'meta',
    Agent:       'meta',
    // Semantic / LSP tools (none observed on this machine — ASM-04/RSK-03)
    LSP:         'semantic',
    // MCP tools (prefix-matched below)
  },
  // Prefix → category (checked after exact, with MCP prefixes stripped)
  prefixPatterns: [
    { re: /^mcp__filesystem__/, category: 'read'   },
    { re: /^mcp__git__/,        category: 'bash'   },
    { re: /^mcp__/,             category: 'mcp'    },
  ],
};

/**
 * Shell-command patterns that indicate a verification run (node --test, npm test, etc.).
 * Matched against the full command string (case-insensitive).
 * Trace: BR-06, AC-05
 */
export const VERIFY_PATTERNS = [
  /node\s+--test/i,
  /npm\s+(?:run\s+)?test/i,
  /yarn\s+test/i,
  /pnpm\s+test/i,
  /jest/i,
  /vitest/i,
  /mocha/i,
  /verify\.ps1/i,
  /verify\.sh/i,
  /pwsh.*verify/i,
  /powershell.*verify/i,
];

/**
 * Patterns that suggest the assistant is claiming completion.
 * Matched against assistant text blocks.
 * Trace: BR-05, AC-04
 */
export const COMPLETION_PATTERNS = [
  /\b(is (now )?complete|has been (implemented|done|finished|added|created))\b/i,
  /\b(implementation is complete|all tests pass|the (fix|feature|change) is|i('ve| have) (implemented|completed|finished|added|created))\b/i,
  /\b(done|ready|working|ship[p]?ed)\b.*\./i,
];

/**
 * Patterns that identify the harness state/progress file being read.
 * Trace: BR-08, AC-07
 */
export const STATE_FILE_PATTERNS = [
  /progress\.md$/i,
  /state\.md$/i,
  /harness.*\.md$/i,
  /status\.md$/i,
];

/**
 * Secret patterns for optional redaction (Slice 4).
 * Placeholder — populated in Phase 4.
 * Trace: NFR-01, RSK-04
 */
export const SECRET_PATTERNS = [];

/**
 * Global defaults.
 */
export const DEFAULTS = {
  outPath: './glassbox-report.html',
  loopThreshold: 3,
};
