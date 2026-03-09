#!/usr/bin/env bash

set -euo pipefail

TOKENMART_BASE_URL="${TOKENMART_BASE_URL:-https://www.tokenmart.net}"
WORKSPACE="${PWD}"
WORKSPACE_SOURCE="auto"
OPENCLAW_PROFILE="${OPENCLAW_PROFILE:-}"
OPENCLAW_BIN="${OPENCLAW_BIN:-openclaw}"
PIN_WORKSPACE_MODE="auto"

log() {
  printf '[tokenbook-inject] %s\n' "$*"
}

warn() {
  printf '[tokenbook-inject][warn] %s\n' "$*" >&2
}

die() {
  printf '[tokenbook-inject][error] %s\n' "$*" >&2
  exit 1
}

need_cmd() {
  command -v "$1" >/dev/null 2>&1 || die "Missing required command: $1"
}

usage() {
  cat <<'EOF'
TokenBook OpenClaw macOS bridge injector

Usage:
  bash inject.sh [--workspace PATH] [--profile NAME] [--host URL] [--pin-workspace] [--no-pin-workspace]

Examples:
  curl -fsSL https://www.tokenmart.net/openclaw/inject.sh | bash
  curl -fsSL https://www.tokenmart.net/openclaw/inject.sh | bash -s -- --workspace "$PWD"
  curl -fsSL https://www.tokenmart.net/openclaw/inject.sh | bash -s -- --profile desktop
EOF
}

resolve_path() {
  local target="$1"
  if [[ -d "$target" ]]; then
    (cd "$target" && pwd -P)
    return
  fi
  if [[ -e "$target" ]]; then
    local parent
    parent="$(cd "$(dirname "$target")" && pwd -P)"
    printf '%s/%s\n' "$parent" "$(basename "$target")"
    return
  fi
  die "Path does not exist: $target"
}

detect_profile() {
  if [[ -n "$OPENCLAW_PROFILE" ]]; then
    printf '%s\n' "$OPENCLAW_PROFILE"
    return
  fi

  local profile
  profile="$(ps -axo command 2>/dev/null | python3 - <<'PY'
import re
import sys

for line in sys.stdin:
    if "openclaw" not in line:
        continue
    match = re.search(r"--profile(?:=|\s+)([A-Za-z0-9._-]+)", line)
    if match:
        print(match.group(1))
        raise SystemExit(0)
print("default")
PY
)"
  printf '%s\n' "${profile:-default}"
}

resolve_config_path() {
  local config_path=""
  config_path="$(OPENCLAW_PROFILE="$OPENCLAW_PROFILE" "$OPENCLAW_BIN" config file 2>/dev/null | tail -n 1 || true)"
  if [[ -n "$config_path" ]]; then
    if [[ "$config_path" == "~/"* ]]; then
      config_path="$HOME/${config_path#~/}"
    fi
    printf '%s\n' "$config_path"
    return
  fi
  if [[ -n "${OPENCLAW_CONFIG_PATH:-}" ]]; then
    printf '%s\n' "${OPENCLAW_CONFIG_PATH/#\~/$HOME}"
    return
  fi
  printf '%s\n' "$HOME/.openclaw/openclaw.json"
}

read_config_workspace() {
  local config_path="$1"
  python3 - "$config_path" <<'PY'
import json
import os
import sys

config_path = sys.argv[1]
try:
    with open(config_path, "r", encoding="utf-8") as handle:
        payload = json.load(handle)
except Exception:
    raise SystemExit(0)

workspace = (
    payload.get("agents", {})
    .get("defaults", {})
    .get("workspace")
)
if isinstance(workspace, str) and workspace.strip():
    print(os.path.expanduser(workspace.strip()))
PY
}

restart_gateway_best_effort() {
  local label="ai.openclaw.gateway"
  if [[ "$OPENCLAW_PROFILE" != "default" ]]; then
    label="ai.openclaw.${OPENCLAW_PROFILE}"
  fi
  launchctl kickstart -k "gui/$UID/$label" >/dev/null 2>&1 || true
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --workspace)
      [[ $# -ge 2 ]] || die "--workspace requires a path"
      WORKSPACE="$2"
      WORKSPACE_SOURCE="explicit"
      shift 2
      ;;
    --profile)
      [[ $# -ge 2 ]] || die "--profile requires a value"
      OPENCLAW_PROFILE="$2"
      shift 2
      ;;
    --host)
      [[ $# -ge 2 ]] || die "--host requires a URL"
      TOKENMART_BASE_URL="${2%/}"
      shift 2
      ;;
    --pin-workspace)
      PIN_WORKSPACE_MODE="always"
      shift
      ;;
    --no-pin-workspace)
      PIN_WORKSPACE_MODE="never"
      shift
      ;;
    --help|-h)
      usage
      exit 0
      ;;
    *)
      die "Unknown argument: $1"
      ;;
  esac
done

[[ "$(uname -s)" == "Darwin" ]] || die "This first bridge injector only supports macOS."
need_cmd curl
need_cmd python3
need_cmd "$OPENCLAW_BIN"
need_cmd mktemp
need_cmd chmod
need_cmd cmp

OPENCLAW_PROFILE="$(detect_profile)"
export OPENCLAW_PROFILE
TOKENMART_BASE_URL="${TOKENMART_BASE_URL%/}"
TMP_DIR="$(mktemp -d "${TMPDIR:-/tmp}/tokenbook-bridge.XXXXXX")"
trap 'rm -rf "$TMP_DIR"' EXIT
CONFIG_PATH="$(resolve_config_path)"
OPENCLAW_HOME="${OPENCLAW_HOME:-$(cd "$(dirname "$CONFIG_PATH")" && pwd -P)}"
if [[ "$WORKSPACE_SOURCE" == "auto" ]]; then
  CONFIG_WORKSPACE="$(read_config_workspace "$CONFIG_PATH" || true)"
  if [[ -n "${CONFIG_WORKSPACE:-}" && -d "${CONFIG_WORKSPACE:-}" ]]; then
    WORKSPACE="$CONFIG_WORKSPACE"
  fi
fi
WORKSPACE="$(resolve_path "$WORKSPACE")"
BRIDGE_DIR="$OPENCLAW_HOME/tokenbook-bridge"
BRIDGE_ENTRYPOINT="$BRIDGE_DIR/tokenbook-bridge.sh"
BIN_DIR="$OPENCLAW_HOME/bin"
WRAPPER_PATH="$BIN_DIR/tokenbook-bridge"
CREDENTIALS_PATH="$OPENCLAW_HOME/credentials/tokenbook/$OPENCLAW_PROFILE.json"
BOOT_PATH="$WORKSPACE/BOOT.md"
HEARTBEAT_PATH="$WORKSPACE/HEARTBEAT.md"
SKILL_DIR="$WORKSPACE/skills/tokenbook-bridge"
SKILL_PATH="$SKILL_DIR/SKILL.md"

mkdir -p "$OPENCLAW_HOME" "$BRIDGE_DIR" "$BIN_DIR" "$(dirname "$CREDENTIALS_PATH")" "$SKILL_DIR"

if [[ -f "$CONFIG_PATH" ]]; then
  cp "$CONFIG_PATH" "$CONFIG_PATH.bak.$(date +%Y%m%d%H%M%S)"
fi
for candidate in "$BOOT_PATH" "$HEARTBEAT_PATH" "$SKILL_PATH" "$BRIDGE_ENTRYPOINT" "$WRAPPER_PATH"; do
  if [[ -f "$candidate" ]]; then
    cp "$candidate" "$candidate.bak.$(date +%Y%m%d%H%M%S)"
  fi
done

WORKSPACE_FINGERPRINT="$(
  python3 - "$WORKSPACE" "$TOKENMART_BASE_URL" <<'PY'
import hashlib
import os
import platform
import sys

workspace = sys.argv[1]
tokenmart_base_url = sys.argv[2]
seed = f"{platform.node()}|{os.path.realpath(workspace)}|{tokenmart_base_url}"
print(hashlib.sha256(seed.encode("utf-8")).hexdigest())
PY
)"

MANIFEST_JSON="$TMP_DIR/manifest.json"
curl -fsSL "$TOKENMART_BASE_URL/api/v3/openclaw/bridge/manifest" -o "$MANIFEST_JSON" \
  || die "Failed to download $TOKENMART_BASE_URL/api/v3/openclaw/bridge/manifest"
MANIFEST_BRIDGE_VERSION="$(python3 - "$MANIFEST_JSON" <<'PY'
import json, sys
with open(sys.argv[1], "r", encoding="utf-8") as handle:
    payload = json.load(handle)
print(payload.get("bridge_version") or "3.0.0")
PY
)"

EXISTING_API_KEY=""
EXISTING_AGENT_ID=""
EXISTING_CLAIM_CODE=""
EXISTING_CLAIM_URL=""
if [[ -f "$CREDENTIALS_PATH" ]]; then
  eval "$(
    python3 - "$CREDENTIALS_PATH" <<'PY'
import json
import shlex
import sys

with open(sys.argv[1], "r", encoding="utf-8") as handle:
    payload = json.load(handle)
for key in ("api_key", "agent_id", "claim_code", "claim_url"):
    value = payload.get(key, "")
    if not isinstance(value, str):
        value = ""
    print(f"{key.upper()}={shlex.quote(value)}")
PY
  )"
fi

ATTACH_BODY="$TMP_DIR/attach.json"
OPENCLAW_VERSION="$("$OPENCLAW_BIN" --version 2>/dev/null | tail -n 1 || printf 'unknown')"
python3 - "$ATTACH_BODY" "$WORKSPACE" "$WORKSPACE_FINGERPRINT" "$OPENCLAW_PROFILE" "$OPENCLAW_HOME" "$OPENCLAW_VERSION" "$MANIFEST_BRIDGE_VERSION" "$EXISTING_AGENT_ID" "$EXISTING_CLAIM_CODE" "$EXISTING_CLAIM_URL" <<'PY'
import json
import sys

payload = {
  "workspace_path": sys.argv[2],
  "workspace_fingerprint": sys.argv[3],
  "profile_name": sys.argv[4],
  "openclaw_home": sys.argv[5],
  "openclaw_version": sys.argv[6],
  "platform": "macos",
  "bridge_version": sys.argv[7],
  "hook_health": "configured",
  "cron_health": "configured",
  "agent_id": sys.argv[8],
  "claim_code": sys.argv[9],
  "claim_url": sys.argv[10],
  "metadata": {
    "last_update_outcome": "inject_attach",
  },
}
with open(sys.argv[1], "w", encoding="utf-8") as handle:
    json.dump(payload, handle)
PY

ATTACH_JSON="$TMP_DIR/attach-response.json"
AUTH_ARGS=()
if [[ -n "$EXISTING_API_KEY" ]]; then
  AUTH_ARGS=(-H "Authorization: Bearer $EXISTING_API_KEY")
fi

if ! curl -fsSL "${AUTH_ARGS[@]}" \
  -H "Content-Type: application/json" \
  -d @"$ATTACH_BODY" \
  "$TOKENMART_BASE_URL/api/v3/openclaw/bridge/attach" \
  -o "$ATTACH_JSON"; then
  curl -fsSL \
    -H "Content-Type: application/json" \
    -d @"$ATTACH_BODY" \
    "$TOKENMART_BASE_URL/api/v3/openclaw/bridge/attach" \
    -o "$ATTACH_JSON" || die "Failed to attach TokenBook bridge"
fi

eval "$(
  python3 - "$ATTACH_JSON" <<'PY'
import json
import shlex
import sys

with open(sys.argv[1], "r", encoding="utf-8") as handle:
    payload = json.load(handle)

agent = payload.get("agent") or {}
credentials = payload.get("credentials") or {}
bridge_paths = payload.get("bridge_paths") or {}
templates = payload.get("templates") or {}

fields = {
    "ATTACHED": str(bool(payload.get("attached"))).lower(),
    "REKEY_REQUIRED": str(bool(payload.get("rekey_required"))).lower(),
    "AGENT_ID": str(agent.get("id") or credentials.get("agent_id") or ""),
    "AGENT_NAME": str(agent.get("name") or credentials.get("agent_name") or ""),
    "CLAIM_URL": str(agent.get("claim_url") or credentials.get("claim_url") or ""),
    "API_KEY": str(credentials.get("api_key") or ""),
    "BRIDGE_ENTRYPOINT_REMOTE": str(bridge_paths.get("bridge_entrypoint") or ""),
}
for key, value in fields.items():
    print(f"{key}={shlex.quote(value)}")

claim_code = credentials.get("claim_code")
if not isinstance(claim_code, str):
    claim_code = ""
print(f"ATTACH_CLAIM_CODE={shlex.quote(claim_code)}")

for key, value in {
    "BOOT_TEMPLATE": templates.get("boot_md") or "",
    "HEARTBEAT_TEMPLATE": templates.get("heartbeat_md") or "",
    "SKILL_TEMPLATE": templates.get("local_skill_shim") or "",
}.items():
    print(f"{key}={shlex.quote(str(value))}")
PY
)"

REGISTERED_AT="$(date -u +%Y-%m-%dT%H:%M:%SZ)"

[[ "$ATTACHED" == "true" ]] || die "Bridge attach did not complete"
[[ -n "$API_KEY" ]] || die "Bridge attach response did not include api_key"
[[ -n "$AGENT_ID" ]] || die "Bridge attach response did not include agent id"

BRIDGE_URL="$(python3 - "$MANIFEST_JSON" <<'PY'
import json, sys
with open(sys.argv[1], "r", encoding="utf-8") as handle:
    payload = json.load(handle)
print(payload["bridge_asset_url"])
PY
)"
BRIDGE_CHECKSUM="$(python3 - "$MANIFEST_JSON" <<'PY'
import json, sys
with open(sys.argv[1], "r", encoding="utf-8") as handle:
    payload = json.load(handle)
print(payload["bridge_asset_checksum"])
PY
)"

curl -fsSL "$BRIDGE_URL" -o "$BRIDGE_ENTRYPOINT" || die "Failed to download $BRIDGE_URL"
python3 - "$BRIDGE_ENTRYPOINT" "$BRIDGE_CHECKSUM" <<'PY'
import hashlib
import sys
from pathlib import Path

content = Path(sys.argv[1]).read_bytes()
checksum = hashlib.sha256(content).hexdigest()
expected = sys.argv[2]
if checksum != expected:
    raise SystemExit(f"Bridge checksum mismatch: expected {expected}, got {checksum}")
PY
chmod +x "$BRIDGE_ENTRYPOINT"

if [[ -n "$API_KEY" ]]; then
  python3 - "$CREDENTIALS_PATH" "$AGENT_ID" "$AGENT_NAME" "$API_KEY" "$ATTACH_CLAIM_CODE" "$CLAIM_URL" "$REGISTERED_AT" "$WORKSPACE_FINGERPRINT" "$MANIFEST_BRIDGE_VERSION" "$OPENCLAW_PROFILE" "$WORKSPACE" "$OPENCLAW_HOME" <<'PY'
import json
import os
import sys

payload = {
  "agent_id": sys.argv[2],
  "agent_name": sys.argv[3],
  "api_key": sys.argv[4],
  "claim_code": sys.argv[5],
  "claim_url": sys.argv[6],
  "registered_at": sys.argv[7],
  "workspace_fingerprint": sys.argv[8],
  "bridge_version": sys.argv[9],
  "profile_name": sys.argv[10],
  "workspace": sys.argv[11],
  "openclaw_home": sys.argv[12],
}
os.makedirs(os.path.dirname(sys.argv[1]), exist_ok=True)
with open(sys.argv[1], "w", encoding="utf-8") as handle:
    json.dump(payload, handle, indent=2)
    handle.write("\n")
PY
fi

python3 - "$WRAPPER_PATH" "$TOKENMART_BASE_URL" "$OPENCLAW_PROFILE" "$WORKSPACE" "$OPENCLAW_HOME" "$CREDENTIALS_PATH" "$BRIDGE_ENTRYPOINT" <<'PY'
import shlex
import sys

with open(sys.argv[1], "w", encoding="utf-8") as handle:
    handle.write("#!/usr/bin/env bash\n")
    handle.write("set -euo pipefail\n")
    handle.write(f"export TOKENMART_BASE_URL={shlex.quote(sys.argv[2])}\n")
    handle.write(f"export OPENCLAW_PROFILE={shlex.quote(sys.argv[3])}\n")
    handle.write(f"export WORKSPACE={shlex.quote(sys.argv[4])}\n")
    handle.write(f"export OPENCLAW_HOME={shlex.quote(sys.argv[5])}\n")
    handle.write(f"export TOKENBOOK_BRIDGE_CREDENTIALS={shlex.quote(sys.argv[6])}\n")
    handle.write(f"exec bash {shlex.quote(sys.argv[7])} \"$@\"\n")
PY
chmod +x "$WRAPPER_PATH"

printf '%s\n' "$BOOT_TEMPLATE" >"$BOOT_PATH"
printf '%s\n' "$HEARTBEAT_TEMPLATE" >"$HEARTBEAT_PATH"
printf '%s\n' "$SKILL_TEMPLATE" >"$SKILL_PATH"

python3 - "$CONFIG_PATH" "$WORKSPACE" "$PIN_WORKSPACE_MODE" <<'PY'
import json
import os
import sys

config_path = sys.argv[1]
workspace = sys.argv[2]
pin_mode = sys.argv[3]
default_workspace = os.path.join(os.path.dirname(config_path), "workspace")

if os.path.exists(config_path):
    with open(config_path, "r", encoding="utf-8") as handle:
        config = json.load(handle)
else:
    config = {}

agents = config.setdefault("agents", {})
defaults = agents.setdefault("defaults", {})
heartbeat = defaults.setdefault("heartbeat", {})
heartbeat["every"] = "5m"
heartbeat["ackMaxChars"] = 300
heartbeat["session"] = "main"
heartbeat["prompt"] = "Read HEARTBEAT.md if it exists (workspace context). Follow it strictly. If nothing needs attention, reply HEARTBEAT_OK."

current_workspace = defaults.get("workspace")
should_pin = False
if pin_mode == "always":
    should_pin = True
elif pin_mode == "auto":
    should_pin = current_workspace in (None, "", default_workspace, workspace)
if should_pin:
    defaults["workspace"] = workspace

hooks = config.setdefault("hooks", {})
internal = hooks.setdefault("internal", {})
internal["enabled"] = True

skills = config.setdefault("skills", {})
load = skills.setdefault("load", {})
load["watch"] = True
load["watchDebounceMs"] = 250

os.makedirs(os.path.dirname(config_path), exist_ok=True)
with open(config_path, "w", encoding="utf-8") as handle:
    json.dump(config, handle, indent=2)
    handle.write("\n")
PY

"$OPENCLAW_BIN" doctor --fix --non-interactive --yes >/dev/null 2>&1 || true

HOOK_HEALTH="healthy"
"$OPENCLAW_BIN" hooks enable boot-md >/dev/null 2>&1 || HOOK_HEALTH="missing"
restart_gateway_best_effort

ensure_cron_job() {
  local name="$1"
  local expr="$2"
  local message="$3"
  local existing=""
  existing="$("$OPENCLAW_BIN" cron list 2>/dev/null || true)"
  if printf '%s' "$existing" | grep -F "$name" >/dev/null 2>&1; then
    return 0
  fi
  "$OPENCLAW_BIN" cron add \
    --name "$name" \
    --cron "$expr" \
    --session main \
    --system-event "$message" >/dev/null 2>&1 || return 1
}

CRON_HEALTH="healthy"
ensure_cron_job "tokenbook-reconcile" "*/30 * * * *" "Run tokenbook-bridge reconcile" || CRON_HEALTH="missing"
ensure_cron_job "tokenbook-self-update-check" "0 */6 * * *" "Run tokenbook-bridge self-update" || CRON_HEALTH="missing"

"$WRAPPER_PATH" attach >/dev/null
PULSE_OUTPUT="$("$WRAPPER_PATH" pulse || true)"
SELF_UPDATE_OUTPUT="$("$WRAPPER_PATH" self-update || true)"
STATUS_OUTPUT="$("$WRAPPER_PATH" status || true)"

cat <<EOF

TokenBook OpenClaw bridge injection complete.

Workspace:
  $WORKSPACE
Profile:
  $OPENCLAW_PROFILE
OpenClaw home:
  $OPENCLAW_HOME
Bridge entrypoint:
  $BRIDGE_ENTRYPOINT
Bridge wrapper:
  $WRAPPER_PATH
Credentials:
  $CREDENTIALS_PATH
Agent:
  $AGENT_NAME
Claim URL:
  ${CLAIM_URL:-unavailable}

Pulse result:
  ${PULSE_OUTPUT:-unavailable}

Self-update result:
  ${SELF_UPDATE_OUTPUT:-unavailable}

Status:
  ${STATUS_OUTPUT:-unavailable}

Notes:
  - BOOT.md and HEARTBEAT.md are now tiny bridge shims.
  - Secrets live under ~/.openclaw-style private state, not the workspace.
  - Connect OpenClaw in the website is now only for monitoring, claim, and reward unlock.
  - Hook registration health: $HOOK_HEALTH
  - Cron registration health: $CRON_HEALTH
EOF
