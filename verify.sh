#!/usr/bin/env bash
# verify.sh — Glassbox verify gate (POSIX)
# The single source of truth for "is the repo green?" (TSD §8, OBJ-5).
#   1. Run all node:test suites.
#   2. Assert NO network imports exist anywhere in src/ or bin/ (NFR-01, AC-11).
# Exit code 0 = green; non-zero = blocked from merge.
set -euo pipefail

cd "$(dirname "$0")"

echo "== Glassbox verify =="

# 1) Tests --------------------------------------------------------------------
echo "-> node --test"
node --test

# 2) No-network check ---------------------------------------------------------
echo "-> no-network import check (src/, bin/)"
pattern="(require\(|from[[:space:]]+|import[[:space:]]*\(|import[[:space:]]+)['\"](node:)?(https?|net|dns)\b"
hits=""
for dir in src bin; do
  [ -d "$dir" ] || continue
  if found=$(grep -REn "$pattern" "$dir" --include='*.js' --include='*.mjs' --include='*.cjs' 2>/dev/null); then
    hits="${hits}${found}\n"
  fi
done

if [ -n "${hits//\\n/}" ]; then
  echo "FAIL: forbidden network import(s) found:"
  printf "%b" "$hits"
  exit 1
fi

echo "PASS: tests green and no network imports."
exit 0
