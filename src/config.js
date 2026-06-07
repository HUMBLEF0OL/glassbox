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
  /\b(?:is (?:now )?complete|has been (?:implemented|done|finished|added|created|fixed|resolved))\b/i,
  /\b(?:all tests pass(?:ing)?|the (?:fix|feature|change|task|issue|bug|work|implementation) (?:is|looks|are) (?:now )?(?:complete|done|finished|ready|fixed|good|working)|i(?:'ve| have) (?:implemented|completed|finished|added|created|fixed|resolved))\b/i,
  /\b(?:i'?m|we'?re|it'?s|this is|that'?s|everything(?:'s| is)|all)\s+(?:now\s+)?(?:done|finished|shipped)\b/i,
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
 * Each entry: { kind: string, re: RegExp }
 * Trace: NFR-01, RSK-04
 */
export const SECRET_PATTERNS = [
  // Anthropic API keys
  { kind: 'anthropic-key',  re: /sk-ant-[A-Za-z0-9\-_]{16,}/g },
  // OpenAI-style keys
  { kind: 'openai-key',     re: /sk-[A-Za-z0-9\-_]{16,}/g },
  // AWS access keys
  { kind: 'aws-key',        re: /AKIA[0-9A-Z]{16}/g },
  // Bearer tokens in headers
  { kind: 'bearer-token',   re: /Bearer\s+[A-Za-z0-9\-_.~+/]{16,}={0,2}/gi },
  // Authorization header value
  { kind: 'auth-header',    re: /Authorization:\s*[^\s'"]{8,}/gi },
  // PEM private keys
  { kind: 'pem-key',        re: /-----BEGIN [A-Z ]*PRIVATE KEY-----[\s\S]*?-----END [A-Z ]*PRIVATE KEY-----/g },
  // .env KEY=value for sensitive names (limited false-positive risk)
  { kind: 'env-secret',     re: /(?:^|[\n\r])(?:[A-Z_]*(?:KEY|TOKEN|SECRET|PASSWORD|PASS|AUTH)[A-Z_]*)=[^\n\r'"]{4,}/gm },
];

/**
 * Global defaults.
 */
export const DEFAULTS = {
  outPath: './glassbox-report.html',
  loopThreshold: 3,
};
