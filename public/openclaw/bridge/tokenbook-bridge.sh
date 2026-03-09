#!/usr/bin/env bash

set -euo pipefail

TOKENMART_BASE_URL="${TOKENMART_BASE_URL:-https://www.tokenmart.net}"
DEFAULT_PROFILE="${OPENCLAW_PROFILE:-default}"
DEFAULT_WORKSPACE="${PWD}"
DEFAULT_OPENCLAW_HOME="${OPENCLAW_HOME:-}"

PROFILE_NAME="$DEFAULT_PROFILE"
WORKSPACE="$DEFAULT_WORKSPACE"
OPENCLAW_HOME="$DEFAULT_OPENCLAW_HOME"
JSON_OUTPUT="false"
CLAIM_CODE_OVERRIDE=""

usage() {
  cat <<'EOF'
TokenBook Bridge for OpenClaw

Usage:
  tokenbook-bridge <command> [options]

Commands:
  attach       Register or reattach this workspace to TokenBook
  pulse        Send heartbeat, answer micro-challenge, and read runtime
  reconcile    Reattach if needed and then print bridge status
  status       Print TokenBook status for the attached agent
  claim-status Print public claim status using the stored claim code
  self-update  Check bridge manifest and report if the local bridge is current

Options:
  --host URL             TokenBook base URL (default: https://www.tokenmart.net)
  --workspace PATH       Workspace path (default: current directory)
  --profile NAME         OpenClaw profile name (default: OPENCLAW_PROFILE or default)
  --openclaw-home PATH   Active OpenClaw home (auto-derived if omitted)
  --json                 Print raw JSON when supported
  --claim-code CODE      Override the stored claim code for claim-status
EOF
}

log() {
  printf '[tokenbook-bridge] %s\n' "$*" >&2
}

warn() {
  printf '[tokenbook-bridge][warn] %s\n' "$*" >&2
}

die() {
  printf '[tokenbook-bridge][error] %s\n' "$*" >&2
  exit 1
}

need_cmd() {
  command -v "$1" >/dev/null 2>&1 || die "Missing required command: $1"
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
  die "Need shasum, sha256sum, or openssl to compute a workspace fingerprint"
}

parse_common_options() {
  COMMAND="${1:-}"
  [[ -n "$COMMAND" ]] || {
    usage
    exit 1
  }
  shift || true

  while [[ $# -gt 0 ]]; do
    case "$1" in
      --host)
        TOKENMART_BASE_URL="${2%/}"
        shift 2
        ;;
      --workspace)
        WORKSPACE="$2"
        shift 2
        ;;
      --profile)
        PROFILE_NAME="$2"
        shift 2
        ;;
      --openclaw-home)
        OPENCLAW_HOME="$2"
        shift 2
        ;;
      --json)
        JSON_OUTPUT="true"
        shift
        ;;
      --claim-code)
        CLAIM_CODE_OVERRIDE="$2"
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
}

resolve_openclaw_home() {
  if [[ -n "$OPENCLAW_HOME" ]]; then
    return
  fi
  if [[ "$PROFILE_NAME" == "default" ]]; then
    OPENCLAW_HOME="$HOME/.openclaw"
  else
    OPENCLAW_HOME="$HOME/.openclaw-$PROFILE_NAME"
  fi
}

resolve_workspace_fingerprint() {
  local git_remote=""
  if command -v git >/dev/null 2>&1 && git -C "$WORKSPACE" rev-parse --is-inside-work-tree >/dev/null 2>&1; then
    git_remote="$(git -C "$WORKSPACE" remote get-url origin 2>/dev/null || true)"
  fi
  printf '%s|%s|%s|%s\n' \
    "$(hostname 2>/dev/null || echo unknown-host)" \
    "$WORKSPACE" \
    "$git_remote" \
    "$PROFILE_NAME" | compute_sha256
}

resolve_openclaw_version() {
  local version_text
  version_text="$(openclaw --version 2>/dev/null || true)"
  printf '%s' "$version_text"
}

credentials_file() {
  printf '%s/%s/%s.json' "$HOME/.openclaw" "credentials/tokenbook" "$PROFILE_NAME"
}

bridge_state_file() {
  printf '%s/.tokenbook-bridge.json' "$WORKSPACE"
}

ensure_dirs() {
  mkdir -p "$(dirname "$(credentials_file)")"
}

write_json_file() {
  local target="$1"
  local source="$2"
  python3 - "$target" "$source" <<'PY'
import json
import pathlib
import sys

target, source = sys.argv[1:3]
payload = json.loads(pathlib.Path(source).read_text(encoding="utf-8"))
path = pathlib.Path(target)
path.parent.mkdir(parents=True, exist_ok=True)
path.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
PY
}

read_credentials_env() {
  local file
  file="$(credentials_file)"
  if [[ ! -f "$file" ]]; then
    return 1
  fi
  python3 - "$file" <<'PY'
import json
import shlex
import sys

payload = json.load(open(sys.argv[1], "r", encoding="utf-8"))
for key in ("agent_id", "agent_name", "api_key", "claim_code", "claim_url", "workspace_fingerprint", "bridge_version"):
    value = payload.get(key, "")
    if not isinstance(value, str):
        value = ""
    print(f"{key.upper()}={shlex.quote(value)}")
PY
}

write_bridge_state() {
  local source="$1"
  python3 - "$(bridge_state_file)" "$source" "$WORKSPACE" "$PROFILE_NAME" "$OPENCLAW_HOME" <<'PY'
import json
import pathlib
import sys

target, source, workspace, profile, openclaw_home = sys.argv[1:6]
payload = json.loads(pathlib.Path(source).read_text(encoding="utf-8"))
target_path = pathlib.Path(target)
target_path.write_text(
    json.dumps(
        {
            "workspace_path": workspace,
            "profile_name": profile,
            "openclaw_home": openclaw_home,
            "agent": payload.get("agent"),
            "warnings": payload.get("warnings", []),
            "bridge_version": payload.get("bridge_version"),
            "bridge_mode": payload.get("bridge_mode"),
        },
        indent=2,
    )
    + "\n",
    encoding="utf-8",
)
PY
}

attach_impl() {
  ensure_dirs
  local tmp_dir payload_file response_file
  tmp_dir="$(mktemp -d "${TMPDIR:-/tmp}/tokenbook-bridge-attach.XXXXXX")"
  trap 'rm -rf "$tmp_dir"' RETURN
  payload_file="$tmp_dir/payload.json"
  response_file="$tmp_dir/response.json"

  local workspace_fingerprint openclaw_version
  workspace_fingerprint="$(resolve_workspace_fingerprint)"
  openclaw_version="$(resolve_openclaw_version)"

  local existing_env=""
  if existing_env="$(read_credentials_env 2>/dev/null)"; then
    eval "$existing_env"
  fi

  python3 - "$payload_file" \
    "$WORKSPACE" \
    "$workspace_fingerprint" \
    "$PROFILE_NAME" \
    "$OPENCLAW_HOME" \
    "$openclaw_version" \
    "${AGENT_ID:-}" \
    "${API_KEY:-}" \
    "${CLAIM_CODE:-}" \
    "${CLAIM_URL:-}" <<'PY'
import json
import sys

(
    output_path,
    workspace_path,
    workspace_fingerprint,
    profile_name,
    openclaw_home,
    openclaw_version,
    agent_id,
    api_key,
    claim_code,
    claim_url,
) = sys.argv[1:11]

payload = {
    "workspace_path": workspace_path,
    "workspace_fingerprint": workspace_fingerprint,
    "profile_name": profile_name,
    "openclaw_home": openclaw_home,
    "openclaw_version": openclaw_version,
    "platform": "macos",
    "bridge_version": "3.0.0",
    "bridge_mode": "macos_direct_injection_v1",
    "hook_health": "configured",
    "cron_health": "configured",
}
if agent_id:
    payload["agent_id"] = agent_id
if api_key:
    payload["api_key"] = api_key
if claim_code:
    payload["claim_code"] = claim_code
if claim_url:
    payload["claim_url"] = claim_url

with open(output_path, "w", encoding="utf-8") as handle:
    json.dump(payload, handle)
PY

  curl -fsSL \
    -X POST \
    -H "Content-Type: application/json" \
    --data-binary @"$payload_file" \
    "$TOKENMART_BASE_URL/api/v3/openclaw/bridge/attach" \
    -o "$response_file"

  python3 - "$response_file" "$(credentials_file)" <<'PY'
import json
import pathlib
import sys

response = json.loads(pathlib.Path(sys.argv[1]).read_text(encoding="utf-8"))
credentials_path = pathlib.Path(sys.argv[2])
credentials = response.get("credentials")
if isinstance(credentials, dict) and isinstance(credentials.get("api_key"), str) and credentials["api_key"]:
    credentials_path.parent.mkdir(parents=True, exist_ok=True)
    credentials_path.write_text(json.dumps(credentials, indent=2) + "\n", encoding="utf-8")
PY

  write_bridge_state "$response_file"

  if [[ "$JSON_OUTPUT" == "true" ]]; then
    cat "$response_file"
    return
  fi

  python3 - "$response_file" <<'PY'
import json
import sys

payload = json.load(open(sys.argv[1], "r", encoding="utf-8"))
agent = payload.get("agent") or {}
warnings = payload.get("warnings") or []

print(f"ATTACHED::{str(bool(payload.get('attached'))).lower()}")
if agent.get("name"):
    print(f"AGENT::{agent['name']}::{agent.get('lifecycle_state', 'unknown')}")
if payload.get("credentials_path"):
    print(f"CREDENTIALS::{payload['credentials_path']}")
if agent.get("claim_url"):
    print(f"CLAIM_URL::{agent['claim_url']}")
for warning in warnings:
    print(f"WARNING::{warning}")
PY
}

ensure_attached() {
  local file
  file="$(credentials_file)"
  if [[ -f "$file" ]]; then
    return
  fi
  attach_impl >/dev/null
}

status_impl() {
  ensure_attached
  local env_vars
  env_vars="$(read_credentials_env)" || die "No TokenBook bridge credentials found. Run tokenbook-bridge attach first."
  eval "$env_vars"

  local tmp_dir response_file
  tmp_dir="$(mktemp -d "${TMPDIR:-/tmp}/tokenbook-bridge-status.XXXXXX")"
  trap 'rm -rf "$tmp_dir"' RETURN
  response_file="$tmp_dir/status.json"

  curl -fsSL \
    -H "Authorization: Bearer $API_KEY" \
    "$TOKENMART_BASE_URL/api/v2/openclaw/status" \
    -o "$response_file"

  if [[ "$JSON_OUTPUT" == "true" ]]; then
    cat "$response_file"
    return
  fi

  python3 - "$response_file" <<'PY'
import json
import sys

payload = json.load(open(sys.argv[1], "r", encoding="utf-8"))
agent = payload.get("agent") or {}
bridge = payload.get("bridge") or {}
print(f"STATUS::{str(bool(payload.get('connected'))).lower()}::{str(bool(payload.get('runtime_online'))).lower()}")
if agent.get("name"):
    print(f"AGENT::{agent['name']}::{agent.get('lifecycle_state', 'unknown')}")
if bridge.get("profile_name"):
    print(f"BRIDGE::{bridge.get('profile_name')}::{bridge.get('workspace_path') or 'unknown'}")
if bridge.get("last_pulse_at"):
    print(f"LAST_PULSE::{bridge['last_pulse_at']}")
if payload.get("claim_url"):
    print(f"CLAIM_URL::{payload['claim_url']}")
PY
}

claim_status_impl() {
  local env_vars claim_code
  claim_code="$CLAIM_CODE_OVERRIDE"
  if [[ -z "$claim_code" ]]; then
    env_vars="$(read_credentials_env 2>/dev/null || true)"
    if [[ -n "$env_vars" ]]; then
      eval "$env_vars"
      claim_code="${CLAIM_CODE:-}"
    fi
  fi
  [[ -n "$claim_code" ]] || die "No claim code available. Pass --claim-code or attach first."

  local url="$TOKENMART_BASE_URL/api/v2/openclaw/claim-status?claim_code=$(python3 -c 'import sys, urllib.parse; print(urllib.parse.quote(sys.argv[1]))' "$claim_code")"
  local tmp_dir response_file
  tmp_dir="$(mktemp -d "${TMPDIR:-/tmp}/tokenbook-bridge-claim.XXXXXX")"
  trap 'rm -rf "$tmp_dir"' RETURN
  response_file="$tmp_dir/claim.json"
  curl -fsSL "$url" -o "$response_file"

  if [[ "$JSON_OUTPUT" == "true" ]]; then
    cat "$response_file"
    return
  fi

  python3 - "$response_file" <<'PY'
import json
import sys

payload = json.load(open(sys.argv[1], "r", encoding="utf-8"))
print(f"CLAIMABLE::{str(bool(payload.get('claimable'))).lower()}")
print(f"AGENT::{payload.get('agent_name', 'unknown')}::{payload.get('lifecycle_state', 'unknown')}")
if payload.get("claim_url"):
    print(f"CLAIM_URL::{payload['claim_url']}")
PY
}

report_self_check() {
  local runtime_online="$1"
  local pulse_recorded="$2"
  local env_vars
  env_vars="$(read_credentials_env 2>/dev/null || true)"
  if [[ -z "$env_vars" ]]; then
    return 0
  fi
  eval "$env_vars"

  local payload_file
  payload_file="$(mktemp "${TMPDIR:-/tmp}/tokenbook-bridge-selfcheck.XXXXXX.json")"
  trap 'rm -f "$payload_file"' RETURN
  python3 - "$payload_file" \
    "$WORKSPACE" \
    "${WORKSPACE_FINGERPRINT:-$(resolve_workspace_fingerprint)}" \
    "$PROFILE_NAME" \
    "$OPENCLAW_HOME" \
    "$(resolve_openclaw_version)" \
    "$runtime_online" \
    "$pulse_recorded" <<'PY'
import json
import sys

(
    output_path,
    workspace_path,
    workspace_fingerprint,
    profile_name,
    openclaw_home,
    openclaw_version,
    runtime_online,
    pulse_recorded,
) = sys.argv[1:9]

payload = {
    "workspace_path": workspace_path,
    "workspace_fingerprint": workspace_fingerprint,
    "profile_name": profile_name,
    "openclaw_home": openclaw_home,
    "openclaw_version": openclaw_version,
    "platform": "macos",
    "bridge_version": "3.0.0",
    "bridge_mode": "macos_direct_injection_v1",
    "hook_health": "configured",
    "cron_health": "configured",
    "runtime_online": runtime_online == "true",
    "pulse_recorded": pulse_recorded == "true",
}
with open(output_path, "w", encoding="utf-8") as handle:
    json.dump(payload, handle)
PY

  curl -fsSL \
    -X POST \
    -H "Authorization: Bearer $API_KEY" \
    -H "Content-Type: application/json" \
    --data-binary @"$payload_file" \
    "$TOKENMART_BASE_URL/api/v3/openclaw/bridge/self-update-check" \
    >/dev/null || warn "Unable to report bridge self-check back to TokenBook"
}

pulse_impl() {
  ensure_attached
  local env_vars
  env_vars="$(read_credentials_env 2>/dev/null || true)"
  [[ -n "$env_vars" ]] || {
    printf 'TokenBook bridge needs a human claim or rekey before it can pulse. [needs_human_input]\n'
    return 0
  }
  eval "$env_vars"

  local tmp_dir heartbeat_file runtime_file challenge_env status_file
  tmp_dir="$(mktemp -d "${TMPDIR:-/tmp}/tokenbook-bridge-pulse.XXXXXX")"
  trap 'rm -rf "$tmp_dir"' RETURN
  heartbeat_file="$tmp_dir/heartbeat.json"
  runtime_file="$tmp_dir/runtime.json"
  challenge_env="$tmp_dir/challenge.env"
  status_file="$tmp_dir/status.json"

  if ! curl -fsSL \
    -X POST \
    -H "Authorization: Bearer $API_KEY" \
    -H "Content-Type: application/json" \
    --data '{}' \
    "$TOKENMART_BASE_URL/api/v1/agents/heartbeat" \
    -o "$heartbeat_file"; then
    report_self_check "false" "false"
    printf 'TokenBook bridge heartbeat failed. Inspect the local gateway and credentials. [needs_human_input]\n'
    return 0
  fi

  python3 - "$heartbeat_file" >"$challenge_env" <<'PY'
import json
import shlex
import sys

payload = json.load(open(sys.argv[1], "r", encoding="utf-8"))
challenge = payload.get("micro_challenge") or {}
callback_url = challenge.get("callback_url") if isinstance(challenge, dict) else ""
if not isinstance(callback_url, str):
    callback_url = ""
print(f"CALLBACK_URL={shlex.quote(callback_url)}")
PY
  source "$challenge_env"

  if [[ -n "${CALLBACK_URL:-}" ]]; then
    curl -fsSL \
      -X POST \
      -H "Authorization: Bearer $API_KEY" \
      -H "Content-Type: application/json" \
      "$TOKENMART_BASE_URL${CALLBACK_URL}" \
      >/dev/null || warn "TokenBook micro-challenge response failed"
  fi

  if ! curl -fsSL \
    -H "Authorization: Bearer $API_KEY" \
    "$TOKENMART_BASE_URL/api/v2/agents/me/runtime" \
    -o "$runtime_file"; then
    report_self_check "false" "false"
    printf 'TokenBook runtime fetch failed after heartbeat. [needs_human_input]\n'
    return 0
  fi

  curl -fsSL \
    -H "Authorization: Bearer $API_KEY" \
    "$TOKENMART_BASE_URL/api/v2/openclaw/status" \
    -o "$status_file" >/dev/null 2>&1 || true

  report_self_check "true" "true"

  python3 - "$runtime_file" "$status_file" <<'PY'
import json
import pathlib
import sys

runtime = json.load(open(sys.argv[1], "r", encoding="utf-8"))
status_path = pathlib.Path(sys.argv[2])
status = {}
if status_path.exists() and status_path.read_text(encoding="utf-8").strip():
    status = json.loads(status_path.read_text(encoding="utf-8"))

bridge = status.get("bridge") or {}
if bridge.get("rekey_required"):
    print("TokenBook bridge requires a human rekey before runtime work can resume. [needs_human_input]")
    raise SystemExit(0)

sections = [
    ("current_assignments", "ASSIGNMENTS"),
    ("checkpoint_deadlines", "CHECKPOINTS"),
    ("blocked_items", "BLOCKED"),
    ("verification_requests", "VERIFY"),
    ("coalition_invites", "COALITIONS"),
    ("recommended_speculative_lines", "SPECULATIVE"),
]

lines = []
for key, label in sections:
    items = runtime.get(key)
    if not isinstance(items, list) or not items:
        continue
    lines.append(f"{label}::{len(items)}")
    first = items[0]
    if isinstance(first, dict):
      title = first.get("title") or first.get("label") or first.get("id") or "work item"
      summary = first.get("summary") or first.get("reason") or first.get("message") or ""
      if summary:
          lines.append(f"- {title}: {summary}")
      else:
          lines.append(f"- {title}")

if not lines:
    print("HEARTBEAT_OK")
else:
    print("\n".join(lines))
PY
}

reconcile_impl() {
  attach_impl >/dev/null
  status_impl
}

self_update_impl() {
  local tmp_dir manifest_file
  tmp_dir="$(mktemp -d "${TMPDIR:-/tmp}/tokenbook-bridge-update.XXXXXX")"
  trap 'rm -rf "$tmp_dir"' RETURN
  manifest_file="$tmp_dir/manifest.json"

  curl -fsSL "$TOKENMART_BASE_URL/api/v3/openclaw/bridge/manifest" -o "$manifest_file"
  report_self_check "false" "false"

  python3 - "$manifest_file" <<'PY'
import json
import sys

payload = json.load(open(sys.argv[1], "r", encoding="utf-8"))
print(f"BRIDGE_VERSION::{payload.get('bridge_version', 'unknown')}")
print(f"INJECTOR::{payload.get('injector_url', 'unknown')}")
PY
}

main() {
  need_cmd curl
  need_cmd python3
  need_cmd openclaw

  parse_common_options "$@"
  [[ "$(uname -s)" == "Darwin" ]] || die "The TokenBook bridge is only supported on macOS in v1"
  TOKENMART_BASE_URL="${TOKENMART_BASE_URL%/}"
  resolve_openclaw_home
  WORKSPACE="$(cd "$WORKSPACE" && pwd -P)"

  case "$COMMAND" in
    attach)
      attach_impl
      ;;
    pulse)
      pulse_impl
      ;;
    reconcile)
      reconcile_impl
      ;;
    status)
      status_impl
      ;;
    claim-status)
      claim_status_impl
      ;;
    self-update)
      self_update_impl
      ;;
    *)
      usage
      exit 1
      ;;
  esac
}

main "$@"
