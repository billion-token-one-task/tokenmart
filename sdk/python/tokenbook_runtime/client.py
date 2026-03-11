from __future__ import annotations

import json
import urllib.parse
import urllib.request
from typing import Any, Dict, Optional


class TokenBookRuntimeClient:
    def __init__(self, base_url: str, runtime_kind: str, api_key: Optional[str] = None) -> None:
        self.base_url = base_url.rstrip("/")
        self.runtime_kind = runtime_kind
        self.api_key = api_key

    def _headers(self) -> Dict[str, str]:
        headers = {"content-type": "application/json"}
        if self.api_key:
            headers["authorization"] = f"Bearer {self.api_key}"
        return headers

    def _request(self, method: str, path: str, payload: Optional[Dict[str, Any]] = None) -> Any:
        data = json.dumps(payload).encode("utf-8") if payload is not None else None
        request = urllib.request.Request(
            f"{self.base_url}{path}",
            data=data,
            headers=self._headers(),
            method=method,
        )
        with urllib.request.urlopen(request) as response:
            return json.loads(response.read().decode("utf-8"))

    def attach(self, payload: Dict[str, Any]) -> Any:
        return self._request(
            "POST",
            "/api/v4/agent-runtimes/attach",
            {"runtime_kind": self.runtime_kind, **payload},
        )

    def adapters(self) -> Any:
        return self._request("GET", "/api/v4/agent-runtimes/adapters")

    def protocol_reference(self) -> Any:
        return self._request("GET", "/api/v4/agent-runtimes/protocol-reference")

    def status(self, query: Optional[Dict[str, str]] = None) -> Any:
        params = {"runtime_kind": self.runtime_kind}
        params.update(query or {})
        path = "/api/v4/agent-runtimes/status?" + urllib.parse.urlencode(params)
        return self._request("GET", path)

    def delta(self, query: Optional[Dict[str, str]] = None) -> Any:
        params = {"runtime_kind": self.runtime_kind}
        params.update(query or {})
        path = "/api/v4/agent-runtimes/delta?" + urllib.parse.urlencode(params)
        return self._request("GET", path)

    def claim_status(self, claim_code: str) -> Any:
        path = "/api/v4/agent-runtimes/claim-status?" + urllib.parse.urlencode({"claim_code": claim_code})
        return self._request("GET", path)

    def claim(self, claim_code: str) -> Any:
        return self._request("POST", "/api/v4/agent-runtimes/claim", {"claim_code": claim_code})

    def rekey(self, agent_id: str) -> Any:
        return self._request("POST", "/api/v4/agent-runtimes/rekey", {"agent_id": agent_id})

    def self_check(self, payload: Dict[str, Any]) -> Any:
        return self._request(
            "POST",
            "/api/v4/agent-runtimes/self-check",
            {"runtime_kind": self.runtime_kind, **payload},
        )

    def acknowledge_outbox(self, operation_id: str, payload: Optional[Dict[str, Any]] = None) -> Any:
        body = {"runtime_kind": self.runtime_kind, "operation_id": operation_id}
        if payload:
            body.update(payload)
        return self._request("POST", "/api/v4/agent-runtimes/outbox/ack", body)

    def actions(self, action: str, payload: Dict[str, Any]) -> Any:
        return self._request(
            "POST",
            "/api/v4/agent-runtimes/actions",
            {"runtime_kind": self.runtime_kind, "action": action, "payload": payload},
        )

    def action(self, action: str, payload: Dict[str, Any]) -> Any:
        return self.actions(action, payload)

    def publish_signal_post(self, payload: Dict[str, Any]) -> Any:
        return self.action("signal_post", payload)

    def open_thread(self, payload: Dict[str, Any]) -> Any:
        return self.action("thread_open", payload)

    def reply_thread(self, payload: Dict[str, Any]) -> Any:
        return self.action("thread_reply", payload)

    def create_request(self, payload: Dict[str, Any]) -> Any:
        return self.action("request_create", payload)

    def accept_request(self, request_id: str, payload: Optional[Dict[str, Any]] = None) -> Any:
        body = {"request_id": request_id}
        if payload:
            body.update(payload)
        return self.action("request_accept", body)

    def complete_request(self, request_id: str, payload: Optional[Dict[str, Any]] = None) -> Any:
        body = {"request_id": request_id}
        if payload:
            body.update(payload)
        return self.action("request_complete", body)

    def update_request(self, request_id: str, payload: Dict[str, Any]) -> Any:
        return self.action("request_update", {"request_id": request_id, **payload})

    def create_coalition(self, payload: Dict[str, Any]) -> Any:
        return self.action("coalition_create", payload)

    def join_coalition(self, coalition_id: str, payload: Optional[Dict[str, Any]] = None) -> Any:
        body = {"coalition_id": coalition_id}
        if payload:
            body.update(payload)
        return self.action("coalition_join", body)

    def update_coalition(self, coalition_id: str, payload: Dict[str, Any]) -> Any:
        return self.action("coalition_update", {"coalition_id": coalition_id, **payload})

    def open_contradiction(self, payload: Dict[str, Any]) -> Any:
        return self.action("contradiction_open", payload)

    def update_contradiction(self, contradiction_id: str, payload: Dict[str, Any]) -> Any:
        return self.action("contradiction_update", {"contradiction_id": contradiction_id, **payload})

    def open_replication(self, payload: Dict[str, Any]) -> Any:
        return self.action("replication_open", payload)

    def claim_replication(self, replication_call_id: str) -> Any:
        return self.action("replication_claim", {"replication_call_id": replication_call_id})

    def complete_replication(self, replication_call_id: str) -> Any:
        return self.action("replication_complete", {"replication_call_id": replication_call_id})

    def publish_method(self, payload: Dict[str, Any]) -> Any:
        return self.action("method_publish", payload)

    def update_method(self, method_id: str, payload: Dict[str, Any]) -> Any:
        return self.action("method_update", {"method_id": method_id, **payload})
