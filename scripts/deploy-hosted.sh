#!/usr/bin/env bash
# Build the totem and publish it behind the PIN gate at totem.chefcontrol.ai.
#
# Same build as `npm run panel`: the SDK is inlined from FAYZ_SDK_DIR and the
# env comes from this machine's .env files. The hosted copy and the glass run
# the same bundle; only the delivery differs.
#
#   ./scripts/deploy-hosted.sh            build + deploy
#   ./scripts/deploy-hosted.sh --no-build deploy what is already in dist/
#
# Needs CLOUDFLARE_API_TOKEN for the FayaLabs account (defaults to the token
# file on the deploy machine).
set -euo pipefail
cd "$(dirname "$0")/.."

SDK="${FAYZ_SDK_DIR:-$(cd ../fayz-sdk-print 2>/dev/null && pwd || true)}"
export CLOUDFLARE_API_TOKEN="${CLOUDFLARE_API_TOKEN:-$(cat ~/.config/fayz/cf-token-fayalabs 2>/dev/null || true)}"
[ -n "$CLOUDFLARE_API_TOKEN" ] || { echo "CLOUDFLARE_API_TOKEN não definido" >&2; exit 1; }

if [ "${1:-}" != "--no-build" ]; then
  [ -d "$SDK/packages/core/src" ] || { echo "SDK não encontrado em $SDK" >&2; exit 1; }
  echo "→ build (SDK: $SDK)"
  FAYZ_SDK_DIR="$SDK" npx vite build >/dev/null
fi
[ -f dist/index.html ] || { echo "dist/ vazio — rode sem --no-build" >&2; exit 1; }

echo "→ copiando para hosting/public/chefcontrol"
rm -rf hosting/public/chefcontrol
mkdir -p hosting/public
cp -r dist hosting/public/chefcontrol

echo "→ deploy"
(cd hosting && npx --yes wrangler@4.168.0 deploy)

release=$(grep -oE "Totem v[0-9.]+" hosting/public/chefcontrol/assets/index-*.js | head -1 || true)
echo "✓ totem.chefcontrol.ai no ar (${release:-versão não encontrada no bundle})"
