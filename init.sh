#!/usr/bin/env bash
# init.sh — Glassbox harness initialization (POSIX).
# Establishes a known-good baseline before any work starts (walkinglabs
# "Initialization needs its own phase", lecture-06; OBJ-5).
#
# Edit the three variables below if the project's commands change. Glassbox is
# zero-dependency, so INSTALL_CMD only verifies the toolchain.
set -euo pipefail
cd "$(dirname "$0")"

INSTALL_CMD="node --version"                 # zero runtime deps; just confirm Node is present
VERIFY_CMD="./verify.sh"                      # tests + no-network grep (the gate)
START_CMD="node bin/glassbox.js --help"       # how to run the tool

echo "== glassbox init =="
echo "cwd: $(pwd)"

echo "-> install / toolchain check: $INSTALL_CMD"
if ! eval "$INSTALL_CMD"; then
  echo "FAIL: toolchain check failed. Install Node.js (>=18.3) and retry." >&2
  exit 1
fi

echo "-> verify baseline: $VERIFY_CMD"
if [ -x "./verify.sh" ] && [ -f "package.json" ]; then
  if ! eval "$VERIFY_CMD"; then
    echo "FAIL: baseline is RED. Fix verify before doing any feature work." >&2
    exit 1
  fi
else
  echo "(skipped: pre-Slice-0 — package.json/verify.sh not present yet)"
fi

echo "-> start command (run manually): $START_CMD"
if [ "${RUN_START_COMMAND:-0}" = "1" ]; then
  eval "$START_CMD"
fi

echo "PASS: baseline ready."
