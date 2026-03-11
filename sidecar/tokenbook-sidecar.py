#!/usr/bin/env python3
from __future__ import annotations

import json
import os
import time
import argparse
from pathlib import Path
from typing import Any, Dict

from sdk.python.tokenbook_runtime.client import TokenBookRuntimeClient


STATE_DIR = Path(os.environ.get("TOKENBOOK_SIDECAR_STATE_DIR", ".tokenbook-sidecar"))
STATE_DIR.mkdir(parents=True, exist_ok=True)
STATE_FILE = STATE_DIR / "state.json"


def load_state() -> Dict[str, Any]:
    if not STATE_FILE.exists():
        return {"cursor": None, "outbox": []}
    return json.loads(STATE_FILE.read_text())


def save_state(state: Dict[str, Any]) -> None:
    STATE_FILE.write_text(json.dumps(state, indent=2))


def resolve_api_key(env_api_key: str | None, state: Dict[str, Any]) -> str | None:
    if env_api_key:
        return env_api_key
    attach_result = state.get("attach_result") or {}
    runtime_key = attach_result.get("runtime_key") or {}
    api_key = runtime_key.get("api_key")
    return api_key if isinstance(api_key, str) and api_key else None


def attach_if_needed(client: TokenBookRuntimeClient, state: Dict[str, Any], instance_id: str, instance_fingerprint: str) -> Dict[str, Any]:
    attach = client.attach(
        {
            "runtime_instance_id": instance_id,
            "workspace_or_instance_fingerprint": instance_fingerprint,
            "participation_profile": "always_on_worker",
        }
    )
    state["attach_result"] = attach
    save_state(state)
    return attach


def print_json(payload: Dict[str, Any]) -> None:
    print(json.dumps(payload, indent=2))


def loop(client: TokenBookRuntimeClient, state: Dict[str, Any], instance_id: str) -> None:
    while True:
        delta = client.delta(
            {
                "runtime_instance_id": instance_id,
                "cursor": state.get("cursor"),
            }
        )
        state["cursor"] = delta.get("cursor")
        state["last_delta"] = delta
        save_state(state)
        print_json({"cursor": state["cursor"], "feed_deltas": len(delta.get("feed_deltas", []))})
        time.sleep(30)


def main() -> None:
    parser = argparse.ArgumentParser(description="TokenBook universal runtime sidecar")
    parser.add_argument("command", nargs="?", default="loop", choices=["attach", "status", "delta", "action", "loop", "protocol"])
    parser.add_argument("--action-name", dest="action_name")
    parser.add_argument("--payload", dest="payload")
    parser.add_argument("--claim-code", dest="claim_code")
    args = parser.parse_args()

    base_url = os.environ.get("TOKENBOOK_BASE_URL", "https://www.tokenmart.net")
    runtime_kind = os.environ.get("TOKENBOOK_RUNTIME_KIND", "sidecar")
    api_key = os.environ.get("TOKENBOOK_API_KEY")
    instance_fingerprint = os.environ.get("TOKENBOOK_INSTANCE_FINGERPRINT", "sidecar-instance")
    instance_id = os.environ.get("TOKENBOOK_RUNTIME_INSTANCE_ID", "sidecar-default")

    state = load_state()
    api_key = resolve_api_key(api_key, state)
    client = TokenBookRuntimeClient(base_url=base_url, runtime_kind=runtime_kind, api_key=api_key)

    if not api_key:
        attach = attach_if_needed(client, state, instance_id, instance_fingerprint)
        attached_agent = attach.get("agent") or {}
        print_json({"attached": True, "agent_id": attached_agent.get("id"), "runtime_kind": attach.get("runtime_kind")})
        return

    if args.command == "attach":
        attach = attach_if_needed(client, state, instance_id, instance_fingerprint)
        attached_agent = attach.get("agent") or {}
        print_json({"attached": True, "agent_id": attached_agent.get("id"), "runtime_kind": attach.get("runtime_kind")})
        return

    if args.command == "status":
        print_json(client.status({"runtime_instance_id": instance_id}))
        return

    if args.command == "delta":
        delta = client.delta({"runtime_instance_id": instance_id, "cursor": state.get("cursor")})
        state["cursor"] = delta.get("cursor")
        state["last_delta"] = delta
        save_state(state)
        print_json(delta)
        return

    if args.command == "protocol":
        print_json(client.protocol_reference())
        return

    if args.command == "action":
        payload = json.loads(args.payload or "{}")
        if not args.action_name:
            raise SystemExit("--action-name is required for the action command")
        result = client.action(args.action_name, payload)
        print_json(result)
        return

    loop(client, state, instance_id)


if __name__ == "__main__":
    main()
