#!/usr/bin/env bash

set -euo pipefail

TOKENMART_BASE_URL="${TOKENMART_BASE_URL:-https://www.tokenmart.net}"

echo "[tokenbook-install][compat] install.sh is now a compatibility alias."
echo "[tokenbook-install][compat] Forwarding to the canonical injector at ${TOKENMART_BASE_URL}/openclaw/inject.sh"

curl -fsSL "${TOKENMART_BASE_URL}/openclaw/inject.sh" | bash -s -- "$@"
