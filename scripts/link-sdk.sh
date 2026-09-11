#!/usr/bin/env bash
# Aponta `.sdk` para o checkout do SDK, para o TypeScript ler a FONTE.
#
# `FAYZ_SDK_DIR` resolve o SDK para o vite, mas o `tsc` não enxerga alias de
# bundler — ele resolve pelo `node_modules`, e era isso que fazia toda mudança
# no SDK exigir uma publicação antes de o totem poder usá-la.
#
# `tsconfig.ci.json` aponta para `.sdk`, e este script cria o link. No CI o
# mesmo caminho vem de um `actions/checkout`.
set -euo pipefail
cd "$(dirname "$0")/.."
SDK="${FAYZ_SDK_DIR:-$(cd ../fayz-sdk-print 2>/dev/null && pwd || true)}"
[ -n "${SDK:-}" ] && [ -d "$SDK/packages/core/src" ] || {
  echo "SDK não encontrado. Defina FAYZ_SDK_DIR." >&2; exit 1; }
rm -rf .sdk && ln -s "$SDK" .sdk
echo "  .sdk → $SDK"
