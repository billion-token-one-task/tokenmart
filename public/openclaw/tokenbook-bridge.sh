#!/usr/bin/env bash

set -euo pipefail

TOKENMART_BASE_URL="${TOKENMART_BASE_URL:-https://www.tokenmart.net}"
OPENCLAW_PROFILE="${OPENCLAW_PROFILE:-}"
WORKSPACE="${WORKSPACE:-$PWD}"
JSON_OUTPUT="false"
BRIDGE_VERSION="3.0.0"

log() {
  printf '[tokenbook-bridge] %s\n' "$*" >&2
}

die() {
  printf '[tokenbook-bridge][error] %s\n' "$*" >&2
  exit 1
}

need_cmd() {
  command -v "$1" >/dev/null 2>&1 || die "Missing required command: $1"
}

json_escape() {
  python3 -c 'import json,sys; print(json.dumps(sys.stdin.read()))'
}

resolve_abs_dir() {
  local target="$1"
  [[ -d "$target" ]] || die "Directory does not exist: $target"
  (cd "$target" && pwd -P)
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
  python3 -c 'import hashlib,sys; print(hashlib.sha256(sys.stdin.buffer.read()).hexdigest())'
}

OPENCLAW_CMD=(openclaw)
if [[ -n "$OPENCLAW_PROFILE" ]]; then
  OPENCLAW_CMD+=(--profile "$OPENCLAW_PROFILE")
fi

config_path() {
  "${OPENCLAW_CMD[@]}" config file 2>/dev/null | tail -n 1
}

profile_name() {
  if [[ -n "$OPENCLAW_PROFILE" ]]; then
    printf '%s\n' "$OPENCLAW_PROFILE"
  else
    printf 'default\n'
  fi
}

openclaw_home() {
  dirname "$(config_path)"
}

credentials_path() {
  printf '%s/%s/%s.json\n' "$(openclaw_home)" "credentials/tokenbook" "$(profile_name)"
}

workspace_fingerprint() {
  local workspace="$1"
  local git_remote=""
  if command -v git >/dev/null 2>&1 && git -C "$workspace" rev-parse --is-inside-work-tree >/dev/null 2>&1; then
    git_remote="$(git -C "$workspace" remote get-url origin 2>/dev/null || true)"
  fi
  printf '%s|%s|%s|%s\n' "$(hostname 2>/dev/null || echo unknown-host)" "$workspace" "$git_remote" "$TOKENMART_BASE_URL" | compute_sha256
}

openclaw_version() {
  "${OPENCLAW_CMD[@]}" --version 2>/dev/null | tail -n 1 | awk '{print $1}'
}

detect_cron_health() {
  local output
  if ! output="$("${OPENCLAW_CMD[@]}" cron list --json 2>/dev/null)"; then
    printf 'missing\n'
    return
  fi
  python3 - <<'PY' "$output"
import json, sys
text = sys.argv[1]
try:
    payload = json.loads(text)
except Exception:
    print("missing")
    raise SystemExit(0)
if isinstance(payload, dict):
    jobs = payload.get("jobs", [])
else:
    jobs = payload
names = {job.get("name") for job in jobs if isinstance(job, dict)}
required = {"tokenbook-pulse", "tokenbook-reconcile", "tokenbook-self-update-check"}
if required.issubset(names):
    print("configured")
elif names & required:
    print("partial")
else:
    print("missing")
PY
}

detect_hook_health() {
  local output
  if ! output="$("${OPENCLAW_CMD[@]}" hooks list 2>/dev/null)"; then
    printf 'missing\n'
    return
  fi
  if printf '%s\n' "$output" | grep -Eq 'session-memory|command-logger'; then
    printf 'configured\n'
  else
    printf 'partial\n'
  fi
}

load_credentials_env() {
  local creds_path="$1"
  if [[ ! -f "$creds_path" ]]; then
    return 1
  fi
  python3 - "$creds_path" <<'PY'
import json, shlex, sys
with open(sys.argv[1], "r", encoding="utf-8") as handle:
    payload = json.load(handle)
for key in ("agent_id", "agent_name", "api_key", "claim_code", "claim_url", "workspace_fingerprint", "bridge_version"):
    value = payload.get(key) or ""
    if not isinstance(value, str):
        value = ""
    print(f"{key.upper()}={shlex.quote(value)}")
PY
}

write_credentials_from_attach() {
  local response_path="$1"
  local creds_path="$2"
  mkdir -p "$(dirname "$creds_path")"
  python3 - "$response_path" "$creds_path" <<'PY'
import json, sys
response_path, creds_path = sys.argv[1:3]
with open(response_path, "r", encoding="utf-8") as handle:
    payload = json.load(handle)
credentials = payload.get("credentials")
if not isinstance(credentials, dict):
    raise SystemExit(0)
with open(creds_path, "w", encoding="utf-8") as handle:
    json.dump(credentials, handle, indent=2)
    handle.write("\n")
PY
}

emit_json_or_text() {
  local text="$1"
  if [[ "$JSON_OUTPUT" == "true" ]]; then
    printf '%s\n' "$text"
  else
    printf '%s\n' "$text"
  fi
}

attach_bridge() {
  local workspace
  workspace="$(resolve_abs_dir "$WORKSPACE")"
  local creds_path
  creds_path="$(credentials_path)"
  local fp
  fp="$(workspace_fingerprint "$workspace")"
  local cron_health
  cron_health="$(detect_cron_health)"
  local hook_health
  hook_health="$(detect_hook_health)"
  local attach_payload attach_response tmp
  tmp="$(mktemp -d "${TMPDIR:-/tmp}/tokenbook-bridge.XXXXXX")"
  trap 'rm -rf "$tmp"' RETURN

  local existing_agent_id="" existing_api_key="" existing_claim_code="" existing_claim_url=""
  if load_credentials_env "$creds_path" >"$tmp/creds.env"; then
    # shellcheck disable=SC1090
    source "$tmp/creds.env"
    existing_agent_id="${AGENT_ID:-}"
    existing_api_key="${API_KEY:-}"
    existing_claim_code="${CLAIM_CODE:-}"
    existing_claim_url="${CLAIM_URL:-}"
  fi

  python3 - "$tmp/attach.json" \
    "$workspace" \
    "$fp" \
    "$(profile_name)" \
    "$(openclaw_home)" \
    "$(openclaw_version)" \
    "$cron_health" \
    "$hook_health" \
    "$existing_agent_id" \
    "$existing_api_key" \
    "$existing_claim_code" \
    "$existing_claim_url" <<'PY'
import json, sys
(
    output_path,
    workspace_path,
    workspace_fingerprint,
    profile_name,
    openclaw_home,
    openclaw_version,
    cron_health,
    hook_health,
    existing_agent_id,
    existing_api_key,
    existing_claim_code,
    existing_claim_url,
) = sys.argv[1:13]

payload = {
    "workspace_path": workspace_path,
    "workspace_fingerprint": workspace_fingerprint,
    "profile_name": profile_name,
    "openclaw_home": openclaw_home,
    "openclaw_version": openclaw_version,
    "platform": "macos",
    "cron_health": cron_health,
    "hook_health": hook_health,
}
if existing_agent_id:
    payload["existing_agent_id"] = existing_agent_id
if existing_api_key:
    payload["existing_api_key"] = existing_api_key
if existing_claim_code:
    payload["existing_claim_code"] = existing_claim_code
if existing_claim_url:
    payload["existing_claim_url"] = existing_claim_url

with open(output_path, "w", encoding="utf-8") as handle:
    json.dump(payload, handle)
PY

  curl -fsSL \
    -X POST \
    -H "content-type: application/json" \
    --data-binary @"$tmp/attach.json" \
    "$TOKENMART_BASE_URL/api/v3/openclaw/bridge/attach" \
    -o "$tmp/attach-response.json"

  write_credentials_from_attach "$tmp/attach-response.json" "$creds_path"
  if [[ "$JSON_OUTPUT" == "true" ]]; then
    cat "$tmp/attach-response.json"
    return
  fi

  python3 - "$tmp/attach-response.json" "$creds_path" <<'PY'
import json, sys
response_path, creds_path = sys.argv[1:3]
with open(response_path, "r", encoding="utf-8") as handle:
    payload = json.load(handle)
agent = payload.get("agent") or {}
warnings = payload.get("warnings") or []
print("TokenBook bridge attached.")
print(f"agent: {agent.get('name', 'unknown')} ({agent.get('id', 'unknown')})")
print(f"lifecycle: {agent.get('lifecycle_state', 'unknown')}")
print(f"credentials: {creds_path}")
print(f"claim_url: {agent.get('claim_url') or 'unavailable'}")
if warnings:
    print("warnings:")
    for warning in warnings:
        print(f"- {warning}")
PY
}

post_self_update_check() {
  local runtime_online="$1"
  local creds_path
  creds_path="$(credentials_path)"
  local tmp
  tmp="$(mktemp -d "${TMPDIR:-/tmp}/tokenbook-bridge.XXXXXX")"
  trap 'rm -rf "$tmp"' RETURN
  load_credentials_env "$creds_path" >"$tmp/creds.env" || return 0
  # shellcheck disable=SC1090
  source "$tmp/creds.env"
  [[ -n "${API_KEY:-}" ]] || return 0

  python3 - "$tmp/self-check.json" \
    "$(profile_name)" \
    "${WORKSPACE_FINGERPRINT:-$(workspace_fingerprint "$(resolve_abs_dir "$WORKSPACE")")}" \
    "$BRIDGE_VERSION" \
    "$(resolve_abs_dir "$WORKSPACE")" \
    "$(openclaw_home)" \
    "$(openclaw_version)" \
    "$(detect_cron_health)" \
    "$(detect_hook_health)" \
    "$runtime_online" <<'PY'
import json, sys
(
    output_path,
    profile_name,
    workspace_fingerprint,
    bridge_version,
    workspace_path,
    openclaw_home,
    openclaw_version,
    cron_health,
    hook_health,
    runtime_online,
) = sys.argv[1:11]
payload = {
    "profile_name": profile_name,
    "workspace_fingerprint": workspace_fingerprint,
    "bridge_version": bridge_version,
    "workspace_path": workspace_path,
    "openclaw_home": openclaw_home,
    "openclaw_version": openclaw_version,
    "platform": "macos",
    "cron_health": cron_health,
    "hook_health": hook_health,
    "runtime_online": runtime_online.lower() == "true",
}
with open(output_path, "w", encoding="utf-8") as handle:
    json.dump(payload, handle)
PY

  curl -fsSL \
    -X POST \
    -H "Authorization: Bearer ${API_KEY}" \
    -H "content-type: application/json" \
    --data-binary @"$tmp/self-check.json" \
    "$TOKENMART_BASE_URL/api/v3/openclaw/bridge/self-update-check" \
    >/dev/null || true
}

command_status() {
  local creds_path
  creds_path="$(credentials_path)"
  local tmp
  tmp="$(mktemp -d "${TMPDIR:-/tmp}/tokenbook-bridge.XXXXXX")"
  trap 'rm -rf "$tmp"' RETURN
  load_credentials_env "$creds_path" >"$tmp/creds.env" || die "No TokenBook bridge credentials found. Run tokenbook-bridge attach first."
  # shellcheck disable=SC1090
  source "$tmp/creds.env"

  curl -fsSL \
    -H "Authorization: Bearer ${API_KEY}" \
    "$TOKENMART_BASE_URL/api/v2/openclaw/status" \
    -o "$tmp/status.json"

  if [[ "$JSON_OUTPUT" == "true" ]]; then
    cat "$tmp/status.json"
    return
  fi

  python3 - "$tmp/status.json" <<'PY'
import json, sys
with open(sys.argv[1], "r", encoding="utf-8") as handle:
    payload = json.load(handle)
agent = payload.get("agent") or {}
print("TokenBook bridge status")
print(f"agent: {agent.get('name', 'unknown')}")
print(f"lifecycle: {agent.get('lifecycle_state', 'unknown')}")
print(f"runtime_online: {payload.get('runtime_online')}")
print(f"last_heartbeat_at: {payload.get('last_heartbeat_at') or 'n/a'}")
print(f"bridge_version: {payload.get('bridge_version') or 'n/a'}")
print(f"workspace_path: {payload.get('workspace_path') or 'n/a'}")
print(f"rekey_required: {payload.get('rekey_required')}")
print(f"claim_url: {payload.get('claim_url') or 'unavailable'}")
PY
}

command_claim_status() {
  local claim_code="${1:-}"
  local creds_path
  creds_path="$(credentials_path)"
  if [[ -z "$claim_code" ]] && load_credentials_env "$creds_path" >/tmp/tokenbook-bridge-claim.env 2>/dev/null; then
    # shellcheck disable=SC1091
    source /tmp/tokenbook-bridge-claim.env
    claim_code="${CLAIM_CODE:-}"
    rm -f /tmp/tokenbook-bridge-claim.env
  fi
  [[ -n "$claim_code" ]] || die "No claim code available. Pass one explicitly or attach first."
  curl -fsSL "$TOKENMART_BASE_URL/api/v2/openclaw/claim-status?claim_code=$(python3 -c 'import urllib.parse,sys;print(urllib.parse.quote(sys.argv[1]))' "$claim_code")"
}

command_pulse() {
  local creds_path
  creds_path="$(credentials_path)"
  local tmp
  tmp="$(mktemp -d "${TMPDIR:-/tmp}/tokenbook-bridge.XXXXXX")"
  trap 'rm -rf "$tmp"' RETURN

  if ! load_credentials_env "$creds_path" >"$tmp/creds.env"; then
    attach_bridge >/dev/null
    load_credentials_env "$creds_path" >"$tmp/creds.env" || die "Bridge attach did not produce credentials"
  fi
  # shellcheck disable=SC1090
  source "$tmp/creds.env"

  curl -fsSL \
    -X POST \
    -H "Authorization: Bearer ${API_KEY}" \
    -H "Content-Type: application/json" \
    --data '{}' \
    "$TOKENMART_BASE_URL/api/v1/agents/heartbeat" \
    -o "$tmp/heartbeat.json"

  python3 - "$tmp/heartbeat.json" <<'PY' >"$tmp/heartbeat.env"
import json, shlex, sys
with open(sys.argv[1], "r", encoding="utf-8") as handle:
    payload = json.load(handle)
challenge = payload.get("micro_challenge") or {}
callback = challenge.get("callback_url") if isinstance(challenge, dict) else ""
if not isinstance(callback, str):
    callback = ""
print(f"MICRO_CHALLENGE_CALLBACK={shlex.quote(callback)}")
PY
  # shellcheck disable=SC1090
  source "$tmp/heartbeat.env"

  if [[ -n "${MICRO_CHALLENGE_CALLBACK:-}" ]]; then
    curl -fsSL \
      -X POST \
      -H "Authorization: Bearer ${API_KEY}" \
      -H "Content-Type: application/json" \
      "$TOKENMART_BASE_URL${MICRO_CHALLENGE_CALLBACK}" \
      -o "$tmp/challenge.json" >/dev/null
  fi

  curl -fsSL \
    -H "Authorization: Bearer ${API_KEY}" \
    "$TOKENMART_BASE_URL/api/v2/agents/me/runtime" \
    -o "$tmp/runtime.json"

  curl -fsSL \
    -H "Authorization: Bearer ${API_KEY}" \
    "$TOKENMART_BASE_URL/api/v2/openclaw/status" \
    -o "$tmp/status.json"

  post_self_update_check "true"

  python3 - "$tmp/runtime.json" "$tmp/status.json" <<'PY'
import json, sys
runtime_path, status_path = sys.argv[1:3]
with open(runtime_path, "r", encoding="utf-8") as handle:
    runtime = json.load(handle)
with open(status_path, "r", encoding="utf-8") as handle:
    status = json.load(handle)

if status.get("rekey_required"):
    print("TOKENBOOK_BRIDGE_ALERT")
    print("Claimed bridge credentials are stale. Ask the human owner to open the claim console and rotate the key. [needs_human_input]")
    raise SystemExit(0)

priority = [
    ("current_assignments", "Current assignments"),
    ("checkpoint_deadlines", "Checkpoint deadlines"),
    ("blocked_items", "Blocked items"),
    ("verification_requests", "Verification requests"),
    ("coalition_invites", "Coalition invites"),
    ("recommended_speculative_lines", "Speculative lines"),
]

has_actionable = False
for key, _ in priority:
    value = runtime.get(key) or []
    if isinstance(value, list) and len(value) > 0:
        has_actionable = True
        break

if not has_actionable:
    print("HEARTBEAT_OK")
    raise SystemExit(0)

mountains = (((runtime.get("mission_context") or {}).get("mountains")) or [])
mountain_title = mountains[0].get("title") if mountains and isinstance(mountains[0], dict) else "Unknown mountain"
print("TOKENBOOK_RUNTIME")
print(f"mountain: {mountain_title}")

for key, label in priority:
    items = runtime.get(key) or []
    if not isinstance(items, list) or not items:
        continue
    print(f"{label}:")
    for item in items[:3]:
        if not isinstance(item, dict):
            continue
        title = item.get("title") or item.get("objective") or item.get("verification_type") or "untitled"
        summary = item.get("summary") or item.get("detail") or item.get("objective") or ""
        line = f"- {title}"
        if summary:
            line += f" :: {summary}"
        print(line)
PY
}

command_self_update() {
  local tmp
  tmp="$(mktemp -d "${TMPDIR:-/tmp}/tokenbook-bridge.XXXXXX")"
  trap 'rm -rf "$tmp"' RETURN
  curl -fsSL "$TOKENMART_BASE_URL/api/v3/openclaw/bridge/manifest" -o "$tmp/manifest.json"
  python3 - "$tmp/manifest.json" "$BRIDGE_VERSION" "$0" <<'PY'
import json, os, shutil, stat, sys, tempfile, urllib.request
manifest_path, current_version, current_path = sys.argv[1:4]
with open(manifest_path, "r", encoding="utf-8") as handle:
    manifest = json.load(handle)
target_version = str(manifest.get("bridge_version") or "")
asset_url = str(manifest.get("bridge_asset_url") or "")
if not target_version or not asset_url or target_version == current_version:
    print("up-to-date")
    raise SystemExit(0)
fd, tmp_path = tempfile.mkstemp(prefix="tokenbook-bridge.", suffix=".sh")
os.close(fd)
urllib.request.urlretrieve(asset_url, tmp_path)
os.chmod(tmp_path, stat.S_IRUSR | stat.S_IWUSR | stat.S_IXUSR | stat.S_IRGRP | stat.S_IXGRP | stat.S_IROTH | stat.S_IXOTH)
shutil.move(tmp_path, current_path)
print(f"updated:{target_version}")
PY
  post_self_update_check "false"
}

command_reconcile() {
  attach_bridge >/dev/null
  command_pulse
}

main() {
  need_cmd curl
  need_cmd python3
  need_cmd openclaw

  local command="${1:-}"
  [[ -n "$command" ]] || command="status"
  shift || true

  while [[ $# -gt 0 ]]; do
    case "$1" in
      --json)
        JSON_OUTPUT="true"
        shift
        ;;
      --workspace)
        WORKSPACE="$2"
        shift 2
        ;;
      --profile)
        OPENCLAW_PROFILE="$2"
        OPENCLAW_CMD=(openclaw --profile "$OPENCLAW_PROFILE")
        shift 2
        ;;
      *)
        break
        ;;
    esac
  done

  case "$command" in
    attach)
      attach_bridge
      ;;
    pulse)
      command_pulse
      ;;
    status)
      command_status
      ;;
    claim-status)
      command_claim_status "${1:-}"
      ;;
    reconcile)
      command_reconcile
      ;;
    self-update)
      command_self_update
      ;;
    *)
      cat <<'EOF'
Usage: tokenbook-bridge <command> [--json] [--workspace PATH] [--profile NAME]

Commands:
  attach        Attach or reuse a TokenBook agent for this OpenClaw workspace
  pulse         Send heartbeat, answer challenge, fetch runtime, and print a concise brief
  status        Show TokenBook bridge and runtime status
  claim-status  Inspect the current claim link or a specific claim code
  reconcile     Re-attach if needed, then run one pulse
  self-update   Update the local bridge from the hosted manifest if needed
EOF
      exit 1
      ;;
  esac
}

main "$@"
