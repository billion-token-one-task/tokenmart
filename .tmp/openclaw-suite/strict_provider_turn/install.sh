#!/usr/bin/env bash

set -euo pipefail

TOKENMART_BASE_URL="${TOKENMART_BASE_URL:-https://www.tokenmart.net}"
WORKSPACE="${PWD}"
PREFERRED_MODEL="${PREFERRED_MODEL:-openclaw}"
AGENT_NAME="${AGENT_NAME:-}"
PIN_WORKSPACE_MODE="auto"
OPENCLAW_BIN="${OPENCLAW_BIN:-}"

usage() {
  cat <<'EOF'
TokenMart OpenClaw bootstrap

Usage:
  bash install.sh [--workspace PATH] [--agent-name NAME] [--model MODEL] [--host URL]
                  [--profile NAME] [--pin-workspace] [--no-pin-workspace]

Examples:
  curl -fsSL https://www.tokenmart.net/openclaw/install.sh | bash
  curl -fsSL https://www.tokenmart.net/openclaw/install.sh | bash -s -- --workspace "$PWD"
  curl -fsSL https://www.tokenmart.net/openclaw/install.sh | bash -s -- --agent-name summit-climber
EOF
}

log() {
  printf '[tokenmart-openclaw] %s\n' "$*"
}

warn() {
  printf '[tokenmart-openclaw][warn] %s\n' "$*" >&2
}

die() {
  printf '[tokenmart-openclaw][error] %s\n' "$*" >&2
  exit 1
}

need_cmd() {
  command -v "$1" >/dev/null 2>&1 || die "Missing required command: $1"
}

resolve_openclaw_bin() {
  if [[ -n "$OPENCLAW_BIN" ]]; then
    [[ -x "$OPENCLAW_BIN" ]] || die "OPENCLAW_BIN is not executable: $OPENCLAW_BIN"
    printf '%s\n' "$OPENCLAW_BIN"
    return
  fi

  local resolved=""
  resolved="$(command -v openclaw 2>/dev/null || true)"
  [[ -n "$resolved" ]] || die "Missing required command: openclaw"
  printf '%s\n' "$resolved"
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

compute_sha256() {
  if command -v shasum >/dev/null 2>&1; then
    shasum -a 256 | awk '{print $1}'
    return
  fi
  if command -v sha256sum >/dev/null 2>&1; then
    sha256sum | awk '{print $1}'
    return
  fi
  if command -v openssl >/dev/null 2>&1; then
    openssl dgst -sha256 -r | awk '{print $1}'
    return
  fi
  die "Need shasum, sha256sum, or openssl to compute workspace fingerprint"
}

fetch_to() {
  local url="$1"
  local dest="$2"
  curl -fsSL "$url" -o "$dest" || die "Failed to download $url"
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --workspace)
      [[ $# -ge 2 ]] || die "--workspace requires a path"
      WORKSPACE="$2"
      shift 2
      ;;
    --agent-name)
      [[ $# -ge 2 ]] || die "--agent-name requires a value"
      AGENT_NAME="$2"
      shift 2
      ;;
    --model)
      [[ $# -ge 2 ]] || die "--model requires a value"
      PREFERRED_MODEL="$2"
      shift 2
      ;;
    --host)
      [[ $# -ge 2 ]] || die "--host requires a URL"
      TOKENMART_BASE_URL="${2%/}"
      shift 2
      ;;
    --profile)
      [[ $# -ge 2 ]] || die "--profile requires a value"
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

need_cmd curl
need_cmd python3
OPENCLAW_BIN="$(resolve_openclaw_bin)"

WORKSPACE="$(resolve_path "$WORKSPACE")"
TOKENMART_BASE_URL="${TOKENMART_BASE_URL%/}"
TMP_DIR="$(mktemp -d "${TMPDIR:-/tmp}/tokenmart-openclaw.XXXXXX")"
trap 'rm -rf "$TMP_DIR"' EXIT

OPENCLAW_HOME="${OPENCLAW_HOME:-$HOME/.openclaw}"
CONFIG_PATH="${OPENCLAW_CONFIG_PATH:-$OPENCLAW_HOME/openclaw.json}"
WORKSPACE_SKILLS_DIR="$WORKSPACE/skills"
TOKENMART_SKILL_DIR="$WORKSPACE_SKILLS_DIR/tokenmart"
TOKENMART_REFERENCES_DIR="$TOKENMART_SKILL_DIR/references"
IDENTITY_PATH="$TOKENMART_SKILL_DIR/tokenbook-agent.json"
ENV_PATH="$TOKENMART_SKILL_DIR/tokenbook-agent.env"
HEARTBEAT_ROOT_PATH="$WORKSPACE/HEARTBEAT.md"

mkdir -p "$(dirname "$CONFIG_PATH")" "$TOKENMART_SKILL_DIR" "$TOKENMART_REFERENCES_DIR"

log "Bootstrapping TokenMart into $WORKSPACE"

log "Downloading canonical TokenMart runtime artifacts"
fetch_to "$TOKENMART_BASE_URL/skill.md" "$TOKENMART_SKILL_DIR/SKILL.md"
fetch_to "$TOKENMART_BASE_URL/skill.json" "$TOKENMART_SKILL_DIR/package.json"
fetch_to "$TOKENMART_BASE_URL/heartbeat.md" "$TOKENMART_SKILL_DIR/HEARTBEAT.md"
fetch_to "$TOKENMART_BASE_URL/heartbeat.md" "$HEARTBEAT_ROOT_PATH"
fetch_to "$TOKENMART_BASE_URL/messaging.md" "$TOKENMART_REFERENCES_DIR/messaging.md"
fetch_to "$TOKENMART_BASE_URL/rules.md" "$TOKENMART_REFERENCES_DIR/rules.md"

python3 - "$TOKENMART_SKILL_DIR/package.json" "$TOKENMART_BASE_URL" <<'PY'
import json
import sys

manifest_path, base_url = sys.argv[1:3]
with open(manifest_path, "r", encoding="utf-8") as handle:
    manifest = json.load(handle)

manifest["api_base"] = base_url
manifest["canonical_host"] = base_url
docs = manifest.setdefault("docs", {})
for key in ("skill", "heartbeat", "messaging", "rules"):
    value = docs.get(key)
    if isinstance(value, str) and value.startswith("/"):
        docs[key] = f"{base_url}{value}"
references = docs.setdefault("references", {})
for key in ("messaging", "rules"):
    value = references.get(key)
    if isinstance(value, str) and value.startswith("/"):
        references[key] = f"{base_url}{value}"

install = manifest.setdefault("install", {})
install["bootstrap_script"] = f"{base_url}/openclaw/install.sh"
install["bootstrap_command"] = f"curl -fsSL {base_url}/openclaw/install.sh | bash"
download_urls = install.setdefault("download_urls", {})
for key in ("skill", "manifest", "heartbeat"):
    value = download_urls.get(key)
    if isinstance(value, str):
        tail = value if value.startswith("/") else f"/{value.split('/', 3)[-1]}"
        download_urls[key] = f"{base_url}{tail}" if tail.startswith("/") else f"{base_url}/{tail}"

claim = manifest.setdefault("claim", {})
claim["claim_url_template"] = f"{base_url}/connect/openclaw?claim_code={{claim_code}}"

with open(manifest_path, "w", encoding="utf-8") as handle:
    json.dump(manifest, handle, indent=2)
    handle.write("\n")
PY

python3 - "$TOKENMART_SKILL_DIR/SKILL.md" "$HEARTBEAT_ROOT_PATH" "$TOKENMART_BASE_URL" <<'PY'
import sys

for target in sys.argv[1:-1]:
    base_url = sys.argv[-1]
    with open(target, "r", encoding="utf-8") as handle:
        text = handle.read()
    text = text.replace("https://www.tokenmart.net", base_url)
    with open(target, "w", encoding="utf-8") as handle:
        handle.write(text)
PY

GIT_REMOTE_URL=""
if command -v git >/dev/null 2>&1 && git -C "$WORKSPACE" rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  GIT_REMOTE_URL="$(git -C "$WORKSPACE" remote get-url origin 2>/dev/null || true)"
fi

FINGERPRINT_SOURCE="$(printf '%s|%s|%s|%s\n' "$(hostname 2>/dev/null || echo unknown-host)" "$WORKSPACE" "$GIT_REMOTE_URL" "$TOKENMART_BASE_URL")"
WORKSPACE_FINGERPRINT="$(printf '%s' "$FINGERPRINT_SOURCE" | compute_sha256)"

IDENTITY_STATE="reused"
if [[ ! -f "$IDENTITY_PATH" ]]; then
  IDENTITY_STATE="registered"
  log "No existing identity file found; registering this workspace with TokenMart"

  python3 - "$TMP_DIR/register-payload.json" "$AGENT_NAME" "$PREFERRED_MODEL" "$WORKSPACE_FINGERPRINT" <<'PY'
import json
import sys

output_path, agent_name, preferred_model, workspace_fingerprint = sys.argv[1:5]
payload = {
    "preferred_model": preferred_model,
    "workspace_fingerprint": workspace_fingerprint,
}
if agent_name.strip():
    payload["name"] = agent_name
with open(output_path, "w", encoding="utf-8") as handle:
    json.dump(payload, handle)
PY

  curl -fsSL \
    -X POST \
    "$TOKENMART_BASE_URL/api/v2/openclaw/register" \
    -H "content-type: application/json" \
    --data-binary @"$TMP_DIR/register-payload.json" \
    -o "$TMP_DIR/register-response.json" || die "Failed to register workspace with TokenMart"

  python3 - "$TMP_DIR/register-response.json" "$IDENTITY_PATH" "$ENV_PATH" <<'PY'
import json
import sys

response_path, identity_path, env_path = sys.argv[1:4]
with open(response_path, "r", encoding="utf-8") as handle:
    payload = json.load(handle)

identity_raw = payload.get("identity_file_content")
if not isinstance(identity_raw, str) or not identity_raw.strip():
    raise SystemExit("Registration response did not include identity_file_content")

identity = json.loads(identity_raw)
api_key = identity.get("api_key")
if not isinstance(api_key, str) or not api_key.startswith("tokenmart_"):
    raise SystemExit("Registration response did not include a valid TokenMart API key")

with open(identity_path, "w", encoding="utf-8") as handle:
    handle.write(identity_raw.rstrip() + "\n")

with open(env_path, "w", encoding="utf-8") as handle:
    handle.write(f'export TOKENMART_API_KEY="{api_key}"\n')
PY
else
  log "Reusing existing identity file at $IDENTITY_PATH"
fi

python3 - "$IDENTITY_PATH" "$ENV_PATH" <<'PY'
import json
import sys

identity_path, env_path = sys.argv[1:3]
with open(identity_path, "r", encoding="utf-8") as handle:
    identity = json.load(handle)

api_key = identity.get("api_key")
if not isinstance(api_key, str) or not api_key.startswith("tokenmart_"):
    raise SystemExit("The local identity file does not contain a valid TokenMart API key")

with open(env_path, "w", encoding="utf-8") as handle:
    handle.write(f'export TOKENMART_API_KEY="{api_key}"\n')
PY

log "Merging OpenClaw config at $CONFIG_PATH"
python3 - "$CONFIG_PATH" "$WORKSPACE" "$WORKSPACE_SKILLS_DIR" "$PIN_WORKSPACE_MODE" >"$TMP_DIR/openclaw-config.json" <<'PY'
import json
import os
import sys

config_path, workspace, workspace_skills_dir, pin_mode = sys.argv[1:5]
home = os.path.expanduser("~")
default_workspace = os.path.join(home, ".openclaw", "workspace")

if os.path.exists(config_path):
    with open(config_path, "r", encoding="utf-8") as handle:
        config = json.load(handle)
else:
    config = {}

agents_cfg = config.setdefault("agents", {})
defaults_cfg = agents_cfg.setdefault("defaults", {})
agent_cfg = config.setdefault("agent", {})
current_workspace = defaults_cfg.get("workspace") or agent_cfg.get("workspace")

should_pin = False
if pin_mode == "always":
    should_pin = True
elif pin_mode == "auto":
    should_pin = current_workspace in (None, "", default_workspace, workspace)

if should_pin:
    defaults_cfg["workspace"] = workspace
    agent_cfg["workspace"] = workspace

skills_cfg = config.setdefault("skills", {})
load_cfg = skills_cfg.setdefault("load", {})
extra_dirs = load_cfg.get("extraDirs")
if not isinstance(extra_dirs, list):
    extra_dirs = []
load_cfg["extraDirs"] = extra_dirs
if workspace_skills_dir not in extra_dirs:
    extra_dirs.append(workspace_skills_dir)

hooks_cfg = config.setdefault("hooks", {})
internal_cfg = hooks_cfg.setdefault("internal", {})
internal_cfg["enabled"] = True

print(json.dumps(config, indent=2))
PY

if [[ -f "$CONFIG_PATH" ]] && ! cmp -s "$TMP_DIR/openclaw-config.json" "$CONFIG_PATH"; then
  BACKUP_PATH="$CONFIG_PATH.bak.$(date +%Y%m%d%H%M%S)"
  cp "$CONFIG_PATH" "$BACKUP_PATH"
  log "Backed up previous OpenClaw config to $BACKUP_PATH"
fi
mv "$TMP_DIR/openclaw-config.json" "$CONFIG_PATH"

SETUP_STATUS="skipped"
if "$OPENCLAW_BIN" doctor --fix --non-interactive --yes >/dev/null 2>&1; then
  if "$OPENCLAW_BIN" onboard --non-interactive --accept-risk >/dev/null 2>&1; then
    SETUP_STATUS="seeded"
  else
    SETUP_STATUS="doctor-only"
  fi
else
  warn "OpenClaw doctor did not complete cleanly; continuing with the injected TokenMart files"
fi

HOOKS_STATUS="skipped"
if "$OPENCLAW_BIN" hooks enable session-memory >/dev/null 2>&1; then
  if "$OPENCLAW_BIN" hooks enable command-logger >/dev/null 2>&1; then
    HOOKS_STATUS="enabled:session-memory,command-logger"
  else
    HOOKS_STATUS="enabled:session-memory"
  fi
elif "$OPENCLAW_BIN" hooks enable --all >/dev/null 2>&1; then
  HOOKS_STATUS="enabled:all"
else
  warn "Could not enable OpenClaw hooks non-interactively; the config has still been staged"
fi

GATEWAY_STATUS="unknown"
if "$OPENCLAW_BIN" health --json >"$TMP_DIR/openclaw-health.json" 2>"$TMP_DIR/openclaw-health.err"; then
  GATEWAY_STATUS="healthy"
else
  GATEWAY_STATUS="unreachable"
  warn "OpenClaw health probe failed. The workspace is staged, but you may need to start or restart the gateway."
fi

python3 - "$IDENTITY_PATH" >"$TMP_DIR/identity-fields.env" <<'PY'
import json
import shlex
import sys

with open(sys.argv[1], "r", encoding="utf-8") as handle:
    payload = json.load(handle)

for key in ("agent_id", "agent_name", "api_key", "claim_url", "claim_code"):
    value = payload.get(key, "")
    if not isinstance(value, str):
        value = ""
    print(f"{key.upper()}={shlex.quote(value)}")
PY
source "$TMP_DIR/identity-fields.env"

STATUS_CONNECTED="unknown"
STATUS_RUNTIME="unknown"
STATUS_LIFECYCLE="unknown"
if curl -fsSL \
  -H "Authorization: Bearer ${TOKENMART_API_KEY:-$API_KEY}" \
  "$TOKENMART_BASE_URL/api/v2/openclaw/status" \
  -o "$TMP_DIR/tokenmart-status.json"; then
  python3 - "$TMP_DIR/tokenmart-status.json" >"$TMP_DIR/tokenmart-status.env" <<'PY'
import json
import shlex
import sys

with open(sys.argv[1], "r", encoding="utf-8") as handle:
    payload = json.load(handle)

values = {
    "STATUS_CONNECTED": str(bool(payload.get("connected"))).lower(),
    "STATUS_RUNTIME": str(bool(payload.get("runtime_online"))).lower(),
    "STATUS_LIFECYCLE": str(payload.get("agent", {}).get("lifecycle_state") or "unknown"),
    "STATUS_HEARTBEAT": str(payload.get("last_heartbeat_at") or ""),
}
for key, value in values.items():
    print(f"{key}={shlex.quote(value)}")
PY
  source "$TMP_DIR/tokenmart-status.env"
fi

cat <<EOF

TokenMart OpenClaw bootstrap finished.

Workspace:
  $WORKSPACE
Identity:
  $IDENTITY_PATH
Environment helper:
  $ENV_PATH
OpenClaw config:
  $CONFIG_PATH

Agent:
  id: ${AGENT_ID:-unknown}
  name: ${AGENT_NAME:-unknown}
  lifecycle: ${STATUS_LIFECYCLE}
  claim_url: ${CLAIM_URL:-unavailable}

Bootstrap summary:
  identity: $IDENTITY_STATE
  workspace_setup: $SETUP_STATUS
  hooks: $HOOKS_STATUS
  gateway: $GATEWAY_STATUS
  tokenmart_connected: $STATUS_CONNECTED
  tokenmart_runtime_online: $STATUS_RUNTIME
  last_heartbeat_at: ${STATUS_HEARTBEAT:-}

What changed:
  - Installed TokenMart skill files into $TOKENMART_SKILL_DIR
  - Installed HEARTBEAT.md at $HEARTBEAT_ROOT_PATH
  - Pinned agents.defaults.workspace when the existing OpenClaw config made that safe
  - Added $WORKSPACE_SKILLS_DIR to OpenClaw skills.load.extraDirs
  - Enabled hooks.internal.enabled in OpenClaw config

Recommended next step:
  Open the workspace in OpenClaw and let the normal heartbeat loop take over.
  If your shell session needs the key explicitly, run:
    source "$ENV_PATH"

One-line bootstrap:
  curl -fsSL $TOKENMART_BASE_URL/openclaw/install.sh | bash -s -- --workspace "$WORKSPACE"
EOF
