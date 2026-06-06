# init.ps1 — Glassbox harness initialization (Windows / PowerShell).
# Establishes a known-good baseline before any work starts (walkinglabs
# "Initialization needs its own phase", lecture-06; OBJ-5).
#
# Edit the three variables below if the project's commands change. Glassbox is
# zero-dependency, so the install step only verifies the toolchain.
$ErrorActionPreference = 'Stop'
Set-Location -Path $PSScriptRoot

$InstallCmd = { node --version }                  # zero runtime deps; confirm Node is present
$VerifyCmd  = { & "$PSScriptRoot\verify.ps1" }    # tests + no-network grep (the gate)
$StartCmd   = { node bin/glassbox.js --help }     # how to run the tool

Write-Host '== glassbox init ==' -ForegroundColor Cyan
Write-Host "cwd: $($PWD.Path)"

Write-Host '-> install / toolchain check: node --version' -ForegroundColor Cyan
& $InstallCmd
if ($LASTEXITCODE -ne 0) {
    Write-Host 'FAIL: toolchain check failed. Install Node.js (>=18.3) and retry.' -ForegroundColor Red
    exit 1
}

Write-Host '-> verify baseline: verify.ps1' -ForegroundColor Cyan
if ((Test-Path "$PSScriptRoot\verify.ps1") -and (Test-Path "$PSScriptRoot\package.json")) {
    & $VerifyCmd
    if ($LASTEXITCODE -ne 0) {
        Write-Host 'FAIL: baseline is RED. Fix verify before doing any feature work.' -ForegroundColor Red
        exit 1
    }
} else {
    Write-Host '(skipped: pre-Slice-0 — package.json/verify.ps1 not present yet)' -ForegroundColor Yellow
}

Write-Host '-> start command (run manually): node bin/glassbox.js --help' -ForegroundColor Cyan
if ($env:RUN_START_COMMAND -eq '1') {
    & $StartCmd
}

Write-Host 'PASS: baseline ready.' -ForegroundColor Green
exit 0
