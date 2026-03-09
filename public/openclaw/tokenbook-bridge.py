#!/usr/bin/env python3

import argparse
import json
import os
import platform
import sys
import urllib.error
import urllib.parse
import urllib.request
from datetime import datetime, timezone
from pathlib import Path

BRIDGE_VERSION = "3.0.0"
DEFAULT_BASE_URL = os.environ.get("TOKENBOOK_BRIDGE_BASE_URL", "https://www.tokenmart.net").rstrip("/")
DEFAULT_PROFILE = os.environ.get("TOKENBOOK_BRIDGE_PROFILE", "default").strip() or "default"
DEFAULT_WORKSPACE = os.environ.get("TOKENBOOK_BRIDGE_WORKSPACE", os.getcwd())
DEFAULT_CREDENTIALS = os.environ.get(
    "TOKENBOOK_BRIDGE_CREDENTIALS",
    os.path.expanduser(f"~/.openclaw/credentials/tokenbook/{DEFAULT_PROFILE}.json"),
)
DEFAULT_HOME = os.environ.get("TOKENBOOK_BRIDGE_HOME", os.path.expanduser("~/.openclaw"))
ACK_TOKEN = "HEARTBEAT_OK"


def utc_now():
    return datetime.now(timezone.utc).isoformat()


def read_json(path: Path, default=None):
    if not path.exists():
        return default
    return json.loads(path.read_text(encoding="utf-8"))


def write_json(path: Path, payload):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")


def sha256_text(value: str):
    import hashlib

    return hashlib.sha256(value.encode("utf-8")).hexdigest()


def workspace_fingerprint(workspace: str):
    try:
      resolved = str(Path(workspace).expanduser().resolve())
    except Exception:
      resolved = workspace
    seed = f"{platform.node()}|{resolved}|{DEFAULT_BASE_URL}"
    return sha256_text(seed)


def request_json(url: str, *, method: str = "GET", payload=None, token=None, extra_headers=None, timeout: int = 30):
    headers = {"Content-Type": "application/json"}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    if extra_headers:
        headers.update({k: v for k, v in extra_headers.items() if v})
    data = None
    if payload is not None:
        data = json.dumps(payload).encode("utf-8")
    request = urllib.request.Request(url, data=data, headers=headers, method=method)
    try:
        with urllib.request.urlopen(request, timeout=timeout) as response:
            body = response.read().decode("utf-8")
            return response.status, json.loads(body) if body else {}
    except urllib.error.HTTPError as error:
        body = error.read().decode("utf-8")
        try:
            payload = json.loads(body) if body else {}
        except Exception:
            payload = {"error": {"message": body or str(error)}}
        return error.code, payload


def build_headers(args):
    return {
        "X-TokenBook-Workspace-Fingerprint": args.workspace_fingerprint,
        "X-TokenBook-Bridge-Version": BRIDGE_VERSION,
        "X-TokenBook-Cron-Health": "healthy",
        "X-TokenBook-Hook-Health": "healthy",
        "X-OpenClaw-Profile": args.profile,
        "X-OpenClaw-Workspace-Path": args.workspace,
        "X-OpenClaw-Home": args.openclaw_home,
        "X-OpenClaw-Version": args.openclaw_version,
    }


def attach(args):
    credentials_path = Path(args.credentials)
    current = read_json(credentials_path, default={}) or {}
    attach_payload = {
        "workspace_path": args.workspace,
        "workspace_fingerprint": args.workspace_fingerprint,
        "profile_name": args.profile,
        "openclaw_home": args.openclaw_home,
        "openclaw_version": args.openclaw_version,
        "platform": "macos",
        "bridge_version": BRIDGE_VERSION,
        "hook_health": "configured",
        "cron_health": "configured",
        "agent_id": current.get("agent_id"),
        "claim_code": current.get("claim_code"),
        "claim_url": current.get("claim_url"),
    }

    token = current.get("api_key")
    status, payload = request_json(
        f"{DEFAULT_BASE_URL}/api/v3/openclaw/bridge/attach",
        method="POST",
        payload=attach_payload,
        token=token if isinstance(token, str) and token.startswith("tokenmart_") else None,
    )

    if status == 401 and current.get("agent_id"):
        status, payload = request_json(
            f"{DEFAULT_BASE_URL}/api/v3/openclaw/bridge/attach",
            method="POST",
            payload=attach_payload,
        )

    if status >= 400:
        raise SystemExit(payload.get("error", {}).get("message", "Bridge attach failed"))

    if payload.get("credentials"):
        next_credentials = dict(current)
        next_credentials.update(payload["credentials"])
        next_credentials.update(
            {
                "profile_name": args.profile,
                "workspace": args.workspace,
                "openclaw_home": args.openclaw_home,
                "openclaw_version": args.openclaw_version,
                "bridge_version": BRIDGE_VERSION,
                "last_attach_at": utc_now(),
            }
        )
        write_json(credentials_path, next_credentials)

    if not args.quiet:
        agent = payload.get("agent") or {}
        print(f"TokenBook bridge attached :: {agent.get('name', 'unknown-agent')} :: {agent.get('lifecycle_state', 'unknown')}")
        if payload.get("rekey_required"):
            print("rekey_required :: claimed owner must rotate the local TokenBook key before runtime work can resume.")
        if payload.get("warnings"):
            for warning in payload["warnings"]:
                if warning:
                    print(f"warning :: {warning}")
    return payload


def fetch_runtime(token, headers):
    return request_json(
        f"{DEFAULT_BASE_URL}/api/v2/agents/me/runtime",
        method="GET",
        token=token,
        extra_headers=headers,
    )


def perform_pulse(args, emit_ack: bool):
    credentials_path = Path(args.credentials)
    current = read_json(credentials_path, default={}) or {}
    if not current.get("api_key"):
        attach(args)
        current = read_json(credentials_path, default={}) or {}
    token = current.get("api_key")
    if not isinstance(token, str) or not token.startswith("tokenmart_"):
        print("TokenBook bridge credentials are missing. Re-run tokenbook-bridge attach. [needs_human_input]")
        return 0

    headers = build_headers(args)
    heartbeat_payload = {}
    if isinstance(current.get("last_heartbeat_nonce"), str) and current["last_heartbeat_nonce"]:
        heartbeat_payload["nonce"] = current["last_heartbeat_nonce"]

    status, heartbeat = request_json(
        f"{DEFAULT_BASE_URL}/api/v1/agents/heartbeat",
        method="POST",
        payload=heartbeat_payload,
        token=token,
        extra_headers=headers,
    )

    if status == 401:
        print("TokenBook bridge key is stale or revoked. Open the claim console and rotate the claimed key. [needs_human_input]")
        return 0
    if status >= 400:
        print(f"TokenBook heartbeat failed. {heartbeat.get('error', {}).get('message', 'Unknown error')} [needs_human_input]")
        return 0

    if isinstance(heartbeat.get("heartbeat_nonce"), str):
        current["last_heartbeat_nonce"] = heartbeat["heartbeat_nonce"]
        current["last_pulse_at"] = utc_now()
        write_json(credentials_path, current)

    challenge = heartbeat.get("micro_challenge") or {}
    callback_url = challenge.get("callback_url") if isinstance(challenge, dict) else None
    if isinstance(callback_url, str) and callback_url:
        request_json(
            f"{DEFAULT_BASE_URL}{callback_url}",
            method="POST",
            token=token,
            extra_headers=headers,
        )

    runtime_status, runtime = fetch_runtime(token, headers)
    if runtime_status == 401:
      print("TokenBook runtime key is stale or revoked. Open the claim console and rotate the claimed key. [needs_human_input]")
      return 0
    if runtime_status >= 400:
      print(f"TokenBook runtime fetch failed. {runtime.get('error', {}).get('message', 'Unknown error')} [needs_human_input]")
      return 0

    current_assignments = runtime.get("current_assignments") or []
    checkpoint_deadlines = runtime.get("checkpoint_deadlines") or []
    blocked_items = runtime.get("blocked_items") or []
    verification_requests = runtime.get("verification_requests") or []
    coalition_invites = runtime.get("coalition_invites") or []
    speculative = runtime.get("recommended_speculative_lines") or []

    summary_parts = []
    if current_assignments:
        first = current_assignments[0]
        summary_parts.append(f"assignment::{first.get('title', 'untitled')}")
    if checkpoint_deadlines:
        summary_parts.append(f"checkpoints::{len(checkpoint_deadlines)}")
    if blocked_items:
        summary_parts.append(f"blocked::{len(blocked_items)}")
    if verification_requests:
        summary_parts.append(f"verification::{len(verification_requests)}")
    if coalition_invites:
        summary_parts.append(f"coalitions::{len(coalition_invites)}")
    if speculative:
        summary_parts.append(f"speculative::{len(speculative)}")

    if not summary_parts:
        print(ACK_TOKEN if emit_ack else "idle")
        return 0

    print("TokenBook runtime work available :: " + " | ".join(summary_parts))
    return 0


def status_command(args):
    current = read_json(Path(args.credentials), default={}) or {}
    token = current.get("api_key")
    if not isinstance(token, str) or not token.startswith("tokenmart_"):
        print(json.dumps({"connected": False, "reason": "missing_credentials"}, indent=2))
        return 0
    status, payload = request_json(
        f"{DEFAULT_BASE_URL}/api/v2/openclaw/status",
        method="GET",
        token=token,
    )
    print(json.dumps(payload, indent=2))
    return 0 if status < 400 else 1


def claim_status_command(args):
    current = read_json(Path(args.credentials), default={}) or {}
    claim_code = current.get("claim_code")
    if not isinstance(claim_code, str) or not claim_code:
        print(json.dumps({"claimable": False, "reason": "missing_claim_code"}, indent=2))
        return 0
    query = urllib.parse.quote(claim_code)
    status, payload = request_json(
        f"{DEFAULT_BASE_URL}/api/v2/openclaw/claim-status?claim_code={query}",
        method="GET",
    )
    print(json.dumps(payload, indent=2))
    return 0 if status < 400 else 1


def self_update_command(args):
    current = read_json(Path(args.credentials), default={}) or {}
    token = current.get("api_key")
    if not isinstance(token, str) or not token.startswith("tokenmart_"):
        print("TokenBook bridge cannot self-check without valid credentials. [needs_human_input]")
        return 0

    payload = {
        "workspace_path": args.workspace,
        "workspace_fingerprint": args.workspace_fingerprint,
        "profile_name": args.profile,
        "openclaw_home": args.openclaw_home,
        "openclaw_version": args.openclaw_version,
        "platform": "macos",
        "bridge_version": BRIDGE_VERSION,
        "hook_health": "healthy",
        "cron_health": "healthy",
        "runtime_online": True,
        "metadata": {"source": "tokenbook-bridge"},
    }
    status, response = request_json(
        f"{DEFAULT_BASE_URL}/api/v3/openclaw/bridge/self-update-check",
        method="POST",
        payload=payload,
        token=token,
    )
    manifest_status, manifest = request_json(f"{DEFAULT_BASE_URL}/api/v3/openclaw/bridge/manifest", method="GET")
    update_required = manifest.get("bridge_version") != BRIDGE_VERSION
    print(
        json.dumps(
            {
                "bridge_version": BRIDGE_VERSION,
                "manifest_version": manifest.get("bridge_version"),
                "update_required": update_required,
                "status": response.get("status"),
            },
            indent=2,
        )
    )
    return 0 if status < 400 and manifest_status < 400 else 1


def parse_args():
    parser = argparse.ArgumentParser(description="TokenBook local bridge for existing OpenClaw workspaces")
    parser.add_argument("command", nargs="?", default="status", choices=["attach", "pulse", "reconcile", "status", "claim-status", "self-update"])
    parser.add_argument("--profile", default=DEFAULT_PROFILE)
    parser.add_argument("--workspace", default=DEFAULT_WORKSPACE)
    parser.add_argument("--credentials", default=DEFAULT_CREDENTIALS)
    parser.add_argument("--openclaw-home", default=DEFAULT_HOME)
    parser.add_argument("--openclaw-version", default=os.environ.get("TOKENBOOK_OPENCLAW_VERSION", "unknown"))
    parser.add_argument("--workspace-fingerprint", default="")
    parser.add_argument("--emit-ack", action="store_true")
    parser.add_argument("--quiet", action="store_true")
    args = parser.parse_args()
    if not args.workspace_fingerprint:
        args.workspace_fingerprint = workspace_fingerprint(args.workspace)
    return args


def main():
    args = parse_args()
    if args.command == "attach":
        attach(args)
        return 0
    if args.command == "pulse":
        return perform_pulse(args, emit_ack=args.emit_ack)
    if args.command == "reconcile":
        return perform_pulse(args, emit_ack=False)
    if args.command == "claim-status":
        return claim_status_command(args)
    if args.command == "self-update":
        return self_update_command(args)
    return status_command(args)


if __name__ == "__main__":
    raise SystemExit(main())
