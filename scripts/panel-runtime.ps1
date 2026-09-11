# The panel runs the exact Electron this repository pins, and nothing else.
#
#   panel-runtime.ps1 -Version 44.3.0 -Sha256 <sha256 of electron-v44.3.0-win32-x64.zip>
#
# The zip comes straight from the Electron release and is checked against the
# checksum the npm package publishes (node_modules/electron/checksums.json), so
# the panel needs no npm at all. npm on the panel could not install Electron
# 44 anyway: its extractor is a native module and npm skips the optional
# platform package (npm/cli#4828).
#
# Each version lives in its own folder, C:\fayz-shell\runtime\<version>, so a
# new one never touches the one that is running, and going back is pointing
# the launcher at the previous folder. Only the line of run-shell.cmd that
# starts Electron is rewritten; the settings above it (printer, exit PIN) are
# the panel's own and stay as they are.
param(
  [Parameter(Mandatory)][string]$Version,
  [Parameter(Mandatory)][string]$Sha256
)
$ErrorActionPreference = "Stop"
$root = "C:\fayz-shell"
$rt   = Join-Path $root "runtime\$Version"
$exe  = Join-Path $rt "electron.exe"

if (-not (Test-Path $exe)) {
  if (Test-Path $rt) { Remove-Item $rt -Recurse -Force }
  $zip = Join-Path $env:TEMP "electron-v$Version-win32-x64.zip"
  $url = "https://github.com/electron/electron/releases/download/v$Version/electron-v$Version-win32-x64.zip"
  & curl.exe -sSfL -o $zip $url
  if ($LASTEXITCODE -ne 0) { Write-Output "  download falhou: $url"; exit 1 }
  $got = (Get-FileHash $zip -Algorithm SHA256).Hash.ToLower()
  if ($got -ne $Sha256.ToLower()) {
    Remove-Item $zip -Force
    Write-Output "  checksum NAO bate ($got), runtime descartado"
    exit 1
  }
  Expand-Archive -Path $zip -DestinationPath $rt -Force
  Remove-Item $zip -Force
}
$installed = (Get-Content (Join-Path $rt "version") -Raw).Trim()

$launcher = Join-Path $root "run-shell.cmd"
$lines = [IO.File]::ReadAllLines($launcher)
$start = "`"$exe`" ."
$hits = 0
$lines = $lines | ForEach-Object {
  if ($_ -match 'electron(\.cmd|\.exe)?"?\s+\.\s*$') { $hits++; $start } else { $_ }
}
if ($hits -ne 1) { Write-Output "  run-shell.cmd: esperava 1 linha do electron, achei $hits; nada mudou"; exit 1 }
[IO.File]::WriteAllText($launcher, (($lines -join "`r`n") + "`r`n"))
Write-Output "  runtime electron $installed -> run-shell.cmd"
