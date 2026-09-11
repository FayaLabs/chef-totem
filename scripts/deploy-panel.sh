#!/usr/bin/env bash
# Build the totem and push it to the panel. ~40 seconds.
#
# The SDK is INLINED by vite at build time — the panel has no `@fayz-ai` in its
# node_modules and the bundle carries no reference to one. That is why this
# works without publishing anything, and also why it only works from a machine
# that has the SDK worktree: FAYZ_SDK_DIR is a bundler alias, not a dependency.
#
#   ./scripts/deploy-panel.sh              build + ship + restart
#   ./scripts/deploy-panel.sh --shell      also ship electron/ (main, preload, ps1)
set -euo pipefail

SDK="${FAYZ_SDK_DIR:-$(cd "$(dirname "$0")/../../fayz-sdk-print" && pwd)}"
HOST="${TOTEM_HOST:-totem}"
REMOTE='C:/fayz-shell'

[ -d "$SDK/packages/core/src" ] || { echo "SDK não encontrado em $SDK" >&2; exit 1; }

echo "→ build (SDK: $SDK)"
FAYZ_SDK_DIR="$SDK" npx vite build >/dev/null

# The shell files change far less often than the bundle, and shipping them
# restarts nothing extra — but they are 200KB against the bundle's 600, so the
# default skips them.
if [ "${1:-}" = "--shell" ]; then
  # The runtime is the version THIS repository pins, not whatever the panel
  # happens to have. Same engine here and there, so a test run locally is a
  # test of what the customer sees.
  EVER=$(node -p "require('./node_modules/electron/package.json').version")
  ESUM=$(node -p "require('./node_modules/electron/checksums.json')['electron-v$EVER-win32-x64.zip']")
  echo "→ shell + electron $EVER"
  scp -q electron/main.cjs electron/preload.cjs electron/exit-hatch.cjs \
         electron/serve-dist.cjs electron/print-raw.ps1 electron/lockdown.ps1 \
         electron/gpu-usage.ps1 scripts/panel-runtime.ps1 "$HOST:$REMOTE/"
  # Only downloads (once per version) and repoints the launcher; the running
  # shell is untouched until the restart below.
  ssh -o ConnectTimeout=30 "$HOST" \
    "powershell -NoProfile -ExecutionPolicy Bypass -File C:/fayz-shell/panel-runtime.ps1 -Version $EVER -Sha256 $ESUM"
fi

echo "→ parando o painel"
ssh -o ConnectTimeout=20 "$HOST" \
  'powershell -NoProfile -Command "Stop-Process -Name electron -Force -ErrorAction SilentlyContinue; Start-Sleep 2; Remove-Item -Recurse -Force C:\fayz-shell\dist -ErrorAction SilentlyContinue"' >/dev/null 2>&1 || true

echo "→ enviando bundle"
scp -qr dist "$HOST:$REMOTE/"

# Via scheduled task, not Start-Process: an SSH session lands in Windows session
# 0, which has no display. The task runs interactively in session 1, which is
# the screen someone is standing in front of.
echo "→ subindo"
ssh -o ConnectTimeout=20 "$HOST" 'schtasks /run /tn "FayzShell"' >/dev/null 2>&1
sleep 12
n=$(ssh -o ConnectTimeout=20 "$HOST" 'powershell -NoProfile -Command "(Get-Process electron -ErrorAction SilentlyContinue | Measure-Object).Count"' 2>/dev/null | tr -d '\r')
echo "✓ painel no ar (${n:-0} processos)"
