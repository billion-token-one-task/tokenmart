#!/usr/bin/env bash

set -euo pipefail

TOKENMART_BASE_URL="${TOKENMART_BASE_URL:-https://www.tokenmart.net}"

printf '[tokenbook-install][compat] install.sh now delegates to inject.sh; use /openclaw/inject.sh for the canonical macOS bridge flow.\n' >&2
TMP_SCRIPT="$(mktemp "${TMPDIR:-/tmp}/tokenbook-inject.XXXXXX")"
trap 'rm -f "$TMP_SCRIPT"' EXIT
curl -fsSL "${TOKENMART_BASE_URL%/}/openclaw/inject.sh" -o "$TMP_SCRIPT"
chmod +x "$TMP_SCRIPT"
exec bash "$TMP_SCRIPT" "$@"
