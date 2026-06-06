# verify.ps1 — Glassbox verify gate (Windows / PowerShell)
# The single source of truth for "is the repo green?" (TSD §8, OBJ-5).
#   1. Run all node:test suites.
#   2. Assert NO network imports exist anywhere in src/ or bin/ (NFR-01, AC-11).
# Exit code 0 = green; non-zero = blocked from merge.

$ErrorActionPreference = 'Stop'
Set-Location -Path $PSScriptRoot

Write-Host '== Glassbox verify ==' -ForegroundColor Cyan

# 1) Tests --------------------------------------------------------------------
Write-Host '-> node --test' -ForegroundColor Cyan
node --test
if ($LASTEXITCODE -ne 0) {
    Write-Host 'FAIL: tests did not pass.' -ForegroundColor Red
    exit 1
}

# 2) No-network check ---------------------------------------------------------
Write-Host '-> no-network import check (src/, bin/)' -ForegroundColor Cyan
$pattern = "(require\(|from\s+|import\s*\(|import\s+)['""](node:)?(https?|net|dns)\b"
$targets = @()
foreach ($dir in @('src', 'bin')) {
    if (Test-Path $dir) {
        $targets += Get-ChildItem -Path $dir -Recurse -File |
            Where-Object { $_.Extension -in '.js', '.mjs', '.cjs' }
    }
}

$violations = $targets | Select-String -Pattern $pattern
if ($violations) {
    Write-Host 'FAIL: forbidden network import(s) found:' -ForegroundColor Red
    $violations | ForEach-Object { Write-Host ("  {0}:{1}: {2}" -f $_.Path, $_.LineNumber, $_.Line.Trim()) -ForegroundColor Red }
    exit 1
}

Write-Host 'PASS: tests green and no network imports.' -ForegroundColor Green
exit 0
