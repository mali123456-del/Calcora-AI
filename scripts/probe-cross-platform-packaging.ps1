#!/usr/bin/env pwsh
<#
  Cross-platform packaging probe.

  The master command requires per-platform BUILD/PACKAGE evidence and forbids
  claiming compatibility from theory. This script attempts each target on this
  host and records exactly what happened:

    * exit code and the decisive error line when a target cannot be produced
    * the artifact list when it can

  It never deletes or overwrites the committed `release/` directory: every
  attempt writes into its own temporary output directory.

  Usage: pwsh scripts/probe-cross-platform-packaging.ps1
#>
param(
  [switch]$IncludeMac,
  [switch]$IncludeLinux
)

$projectRoot = Split-Path -Parent $PSScriptRoot
$outputBase = Join-Path $env:TEMP 'calcora-cross-platform'
if (Test-Path $outputBase) { Remove-Item $outputBase -Recurse -Force -ErrorAction SilentlyContinue }
New-Item -ItemType Directory -Path $outputBase -Force | Out-Null

$targets = @()
if ($IncludeLinux) { $targets += @{ name = 'linux';  args = @('--linux', 'AppImage', 'deb') } }
if ($IncludeMac)   { $targets += @{ name = 'mac';    args = @('--mac', 'zip') } }

if ($targets.Count -eq 0) {
  Write-Host 'Nothing to probe. Pass -IncludeLinux and/or -IncludeMac.'
  exit 2
}

$results = @()
foreach ($target in $targets) {
  $outDir = Join-Path $outputBase $target.name
  Write-Host ''
  Write-Host "=== $($target.name): electron-builder $($target.args -join ' ') -> $outDir"
  $started = Get-Date
  $output = & npx electron-builder @($target.args + @('--publish', 'never', "--config.directories.output=$outDir")) 2>&1
  $code = $LASTEXITCODE
  $seconds = [math]::Round(((Get-Date) - $started).TotalSeconds, 1)

  if ($code -eq 0) {
    $artifacts = Get-ChildItem $outDir -File -ErrorAction SilentlyContinue | Select-Object -ExpandProperty Name
    Write-Host "RESULT $($target.name): PACKAGED in ${seconds}s -> $($artifacts -join ', ')"
    $results += [pscustomobject]@{ platform = $target.name; status = 'PACKAGED'; seconds = $seconds; detail = ($artifacts -join ', ') }
  } else {
    $decisive = ($output | Select-String -Pattern '⨯|error|Error:|not supported|requires' | Select-Object -Last 3 | ForEach-Object { $_.Line.Trim() }) -join ' | '
    Write-Host "RESULT $($target.name): NOT PACKAGED (exit $code) after ${seconds}s"
    Write-Host "  decisive: $decisive"
    $results += [pscustomobject]@{ platform = $target.name; status = 'NOT PACKAGED ON THIS HOST'; seconds = $seconds; detail = $decisive }
  }
}

Write-Host ''
Write-Host '=== Summary'
foreach ($result in $results) { Write-Host ("{0,-7} {1,-26} {2,6}s  {3}" -f $result.platform, $result.status, $result.seconds, $result.detail) }
