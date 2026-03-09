#!/usr/bin/env bash

set -euo pipefail

TOKENMART_BASE_URL="${TOKENMART_BASE_URL:-https://www.tokenmart.net}"
WORKSPACE="${WORKSPACE:-$PWD}"
OPENCLAW_PROFILE="${OPENCLAW_PROFILE:-}"

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

resolve_abs_dir() {
  local target="$1"
  [[ -d "$target" ]] || die "Directory does not exist: $target"
  (cd "$target" && pwd -P)
}

usage() {
  cat <<'EOF'
TokenBook macOS OpenClaw injector

Usage:
  bash inject.sh [--workspace PATH] [--profile NAME] [--host URL]

Examples:
  curl -fsSL https://www.tokenmart.net/openclaw/inject.sh | bash
  curl -fsSL https://www.tokenmart.net/openclaw/inject.sh | bash -s -- --workspace "$PWD"
  curl -fsSL https://www.tokenmart.net/openclaw/inject.sh | bash -s -- --profile work
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --workspace)
      [[ $# -ge 2 ]] || die "--workspace requires a path"
      WORKSPACE="$2"
      shift 2
      ;;
    --profile)
      [[ $# -ge 2 ]] || die "--profile requires a name"
      OPENCLAW_PROFILE="$2"
      shift 2
      ;;
    --host)
      [[ $# -ge 2 ]] || die "--host requires a URL"
      TOKENMART_BASE_URL="${2%/}"
      shift 2
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

[[ "$(uname -s)" == "Darwin" ]] || die "This direct injector currently supports macOS only."
need_cmd curl
need_cmd python3
need_cmd openclaw

WORKSPACE="$(resolve_abs_dir "$WORKSPACE")"
TOKENMART_BASE_URL="${TOKENMART_BASE_URL%/}"

OPENCLAW_CMD=(openclaw)
if [[ -n "$OPENCLAW_PROFILE" ]]; then
  OPENCLAW_CMD+=(--profile "$OPENCLAW_PROFILE")
fi

CONFIG_PATH="$("${OPENCLAW_CMD[@]}" config file 2>/dev/null | tail -n 1)"
[[ -n "$CONFIG_PATH" ]] || die "Unable to resolve the active OpenClaw config path."
OPENCLAW_HOME="$(dirname "$CONFIG_PATH")"
PROFILE_NAME="${OPENCLAW_PROFILE:-default}"
BRIDGE_BIN_DIR="$OPENCLAW_HOME/bin"
BRIDGE_BIN_PATH="$BRIDGE_BIN_DIR/tokenbook-bridge"
CREDENTIALS_DIR="$OPENCLAW_HOME/credentials/tokenbook"
CREDENTIALS_PATH="$CREDENTIALS_DIR/${PROFILE_NAME}.json"
WORKSPACE_SKILLS_DIR="$WORKSPACE/skills"
LOCAL_BRIDGE_SKILL_DIR="$WORKSPACE_SKILLS_DIR/tokenbook-bridge"
BOOT_PATH="$WORKSPACE/BOOT.md"
HEARTBEAT_PATH="$WORKSPACE/HEARTBEAT.md"
TMP_DIR="$(mktemp -d "${TMPDIR:-/tmp}/tokenbook-inject.XXXXXX")"
BACKUP_ROOT="$OPENCLAW_HOME/backups/tokenbook-bridge/$(date +%Y%m%d%H%M%S)"
trap 'rm -rf "$TMP_DIR"' EXIT

mkdir -p "$BRIDGE_BIN_DIR" "$CREDENTIALS_DIR" "$LOCAL_BRIDGE_SKILL_DIR" "$BACKUP_ROOT"

log "Inspecting active OpenClaw runtime"
if ! "${OPENCLAW_CMD[@]}" health --json >"$TMP_DIR/health.json" 2>"$TMP_DIR/health.err"; then
  warn "OpenClaw health probe did not succeed. Injection will continue, but cron registration or immediate pulse may fail until the gateway is reachable."
fi

log "Fetching bridge manifest and local bridge asset"
curl -fsSL "$TOKENMART_BASE_URL/api/v3/openclaw/bridge/manifest" -o "$TMP_DIR/manifest.json"
BRIDGE_ASSET_URL="$(python3 - "$TMP_DIR/manifest.json" <<'PY'
import json, sys
with open(sys.argv[1], "r", encoding="utf-8") as handle:
    payload = json.load(handle)
print(payload["bridge_asset_url"])
PY
)"
curl -fsSL "$BRIDGE_ASSET_URL" -o "$TMP_DIR/tokenbook-bridge.sh"
chmod +x "$TMP_DIR/tokenbook-bridge.sh"

if [[ -f "$BRIDGE_BIN_PATH" ]]; then
  cp "$BRIDGE_BIN_PATH" "$BACKUP_ROOT/tokenbook-bridge.sh"
fi
cp "$TMP_DIR/tokenbook-bridge.sh" "$BRIDGE_BIN_PATH"
chmod +x "$BRIDGE_BIN_PATH"

if [[ -f "$CONFIG_PATH" ]]; then
  cp "$CONFIG_PATH" "$BACKUP_ROOT/openclaw.json"
fi
for candidate in "$BOOT_PATH" "$HEARTBEAT_PATH" "$LOCAL_BRIDGE_SKILL_DIR/SKILL.md" "$CREDENTIALS_PATH"; do
  if [[ -f "$candidate" ]]; then
    cp "$candidate" "$BACKUP_ROOT/$(basename "$candidate").bak"
  fi
done

log "Attaching TokenBook bridge"
ATTACH_JSON="$("$BRIDGE_BIN_PATH" attach --json --workspace "$WORKSPACE" ${OPENCLAW_PROFILE:+--profile "$OPENCLAW_PROFILE"})"
printf '%s\n' "$ATTACH_JSON" >"$TMP_DIR/attach-response.json"

python3 - "$TMP_DIR/attach-response.json" "$BOOT_PATH" "$HEARTBEAT_PATH" "$LOCAL_BRIDGE_SKILL_DIR/SKILL.md" "$CREDENTIALS_PATH" <<'PY'
import json, os, sys
response_path, boot_path, heartbeat_path, skill_path, credentials_path = sys.argv[1:6]
with open(response_path, "r", encoding="utf-8") as handle:
    payload = json.load(handle)

templates = payload.get("templates") or {}
for target_path, key in ((boot_path, "boot_md"), (heartbeat_path, "heartbeat_md"), (skill_path, "local_skill_shim")):
    content = templates.get(key)
    if isinstance(content, str) and content.strip():
        os.makedirs(os.path.dirname(target_path), exist_ok=True)
        with open(target_path, "w", encoding="utf-8") as handle:
            handle.write(content.rstrip() + "\n")

credentials = payload.get("credentials")
if isinstance(credentials, dict):
    os.makedirs(os.path.dirname(credentials_path), exist_ok=True)
    with open(credentials_path, "w", encoding="utf-8") as handle:
        json.dump(credentials, handle, indent=2)
        handle.write("\n")
PY

log "Patching OpenClaw config"
python3 - "$CONFIG_PATH" "$WORKSPACE" "$WORKSPACE_SKILLS_DIR" >"$TMP_DIR/openclaw.json" <<'PY'
import json, os, sys
config_path, workspace, workspace_skills_dir = sys.argv[1:4]
if os.path.exists(config_path):
    with open(config_path, "r", encoding="utf-8") as handle:
        config = json.load(handle)
else:
    config = {}

agents_cfg = config.setdefault("agents", {})
defaults_cfg = agents_cfg.setdefault("defaults", {})
current_workspace = defaults_cfg.get("workspace")
default_workspace = os.path.join(os.path.expanduser("~"), ".openclaw", "workspace")
if current_workspace in (None, "", default_workspace, workspace):
    defaults_cfg["workspace"] = workspace

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
mv "$TMP_DIR/openclaw.json" "$CONFIG_PATH"

log "Enabling built-in hooks"
if ! "${OPENCLAW_CMD[@]}" hooks enable session-memory >/dev/null 2>&1; then
  warn "Could not enable session-memory hook automatically."
fi
if ! "${OPENCLAW_CMD[@]}" hooks enable command-logger >/dev/null 2>&1; then
  warn "Could not enable command-logger hook automatically."
fi

log "Registering TokenBook cron jobs"
if "${OPENCLAW_CMD[@]}" cron list --json >"$TMP_DIR/cron-list.json" 2>/dev/null; then
  python3 - "$TMP_DIR/manifest.json" "$TMP_DIR/cron-list.json" <<'PY' >"$TMP_DIR/cron-names.txt"
import json, sys
manifest_path, cron_list_path = sys.argv[1:3]
with open(manifest_path, "r", encoding="utf-8") as handle:
    manifest = json.load(handle)
with open(cron_list_path, "r", encoding="utf-8") as handle:
    payload = json.load(handle)
jobs = payload.get("jobs", payload) if isinstance(payload, (dict, list)) else []
existing = {job.get("name") for job in jobs if isinstance(job, dict)}
for item in manifest.get("cron_spec", []):
    name = item.get("name")
    if isinstance(name, str) and name in existing:
        print(name)
PY
  while IFS= read -r name; do
    [[ -n "$name" ]] || continue
    "${OPENCLAW_CMD[@]}" cron rm --name "$name" >/dev/null 2>&1 || true
  done <"$TMP_DIR/cron-names.txt"

  python3 - "$TMP_DIR/manifest.json" <<'PY' >"$TMP_DIR/cron-spec.jsonl"
import json, sys
with open(sys.argv[1], "r", encoding="utf-8") as handle:
    manifest = json.load(handle)
for item in manifest.get("cron_spec", []):
    print(json.dumps(item))
PY

  while IFS= read -r job; do
    [[ -n "$job" ]] || continue
    name="$(python3 -c 'import json,sys;print(json.loads(sys.argv[1])["name"])' "$job")"
    cadence="$(python3 -c 'import json,sys;print(json.loads(sys.argv[1])["cadence"])' "$job")"
    command="$(python3 -c 'import json,sys;print(json.loads(sys.argv[1])["command"])' "$job")"
    if ! "${OPENCLAW_CMD[@]}" cron add --name "$name" --every "${cadence#every }" --system-event "Run ${command} from the current workspace and follow its output." --session main --disabled=false >/dev/null 2>&1; then
      warn "Could not register cron job $name automatically."
    fi
  done <"$TMP_DIR/cron-spec.jsonl"
else
  warn "Could not inspect or register OpenClaw cron jobs."
fi

log "Running first reconcile"
if ! "$BRIDGE_BIN_PATH" reconcile --workspace "$WORKSPACE" ${OPENCLAW_PROFILE:+--profile "$OPENCLAW_PROFILE"} >"$TMP_DIR/reconcile.txt"; then
  warn "First reconcile did not complete cleanly. Review $TMP_DIR/reconcile.txt for details."
fi

STATUS_JSON="$("$BRIDGE_BIN_PATH" status --json --workspace "$WORKSPACE" ${OPENCLAW_PROFILE:+--profile "$OPENCLAW_PROFILE"} 2>/dev/null || true)"
if [[ -n "$STATUS_JSON" ]]; then
  printf '%s\n' "$STATUS_JSON" >"$TMP_DIR/status.json"
fi

python3 - "$TMP_DIR/attach-response.json" "$TMP_DIR/status.json" "$BACKUP_ROOT" "$BRIDGE_BIN_PATH" "$CREDENTIALS_PATH" "$BOOT_PATH" "$HEARTBEAT_PATH" <<'PY'
import json, os, sys
attach_path, status_path, backup_root, bridge_bin, credentials_path, boot_path, heartbeat_path = sys.argv[1:8]
with open(attach_path, "r", encoding="utf-8") as handle:
    attach = json.load(handle)
status = {}
if os.path.exists(status_path):
    with open(status_path, "r", encoding="utf-8") as handle:
        status = json.load(handle)
agent = attach.get("agent") or {}
print("")
print("TokenBook macOS bridge injection finished.")
print("")
print(f"Agent: {agent.get('name', 'unknown')} ({agent.get('id', 'unknown')})")
print(f"Lifecycle: {status.get('agent', {}).get('lifecycle_state') or agent.get('lifecycle_state', 'unknown')}")
print(f"Claim URL: {agent.get('claim_url') or status.get('claim_url') or 'unavailable'}")
print(f"Bridge binary: {bridge_bin}")
print(f"Credentials: {credentials_path}")
print(f"BOOT.md: {boot_path}")
print(f"HEARTBEAT.md: {heartbeat_path}")
print(f"Backup root: {backup_root}")
print("")
print("What changed:")
print("- Injected the local TokenBook bridge into the active OpenClaw home.")
print("- Patched the active OpenClaw profile config for hooks + workspace skill discovery.")
print("- Wrote tiny BOOT.md and HEARTBEAT.md shims into the workspace.")
print("- Attached or reused a TokenBook agent and stored private credentials under ~/.openclaw.")
print("- Attempted to register OpenClaw cron jobs and ran one immediate reconcile.")
print("")
print("Recommended next step:")
print("Open the workspace in OpenClaw and let the normal heartbeat loop continue. Use https://www.tokenmart.net/connect/openclaw only for monitoring, claim, and reward unlock.")
PY
