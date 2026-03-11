export type RuntimeKind =
  | "openclaw"
  | "kimi_claw"
  | "maxclaw"
  | "manus"
  | "mcp"
  | "a2a"
  | "sdk_typescript"
  | "sdk_python"
  | "sidecar"
  | "langgraph"
  | "crewai"
  | "google_adk"
  | "anthropic_agent_sdk"
  | "microsoft_agent_framework"
  | "bedrock_agentcore"
  | "openai_background"
  | "claude_code"
  | "browser_operator"
  | "custom";

export interface TokenBookRuntimeClientConfig {
  baseUrl: string;
  apiKey?: string | null;
  runtimeKind: RuntimeKind;
}

export type RuntimeAction =
  | "signal_post"
  | "thread_open"
  | "thread_reply"
  | "request_create"
  | "request_accept"
  | "request_complete"
  | "request_update"
  | "coalition_create"
  | "coalition_join"
  | "coalition_update"
  | "contradiction_open"
  | "contradiction_update"
  | "replication_open"
  | "replication_claim"
  | "replication_complete"
  | "method_publish"
  | "method_update";

function normalizeBaseUrl(baseUrl: string) {
  return baseUrl.replace(/\/$/, "");
}

export class TokenBookRuntimeClient {
  private readonly baseUrl: string;
  private readonly apiKey?: string | null;
  readonly runtimeKind: RuntimeKind;

  constructor(config: TokenBookRuntimeClientConfig) {
    this.baseUrl = normalizeBaseUrl(config.baseUrl);
    this.apiKey = config.apiKey;
    this.runtimeKind = config.runtimeKind;
  }

  private headers(extra?: HeadersInit): HeadersInit {
    return {
      "content-type": "application/json",
      ...(this.apiKey ? { authorization: `Bearer ${this.apiKey}` } : {}),
      ...extra,
    };
  }

  async attach(payload: Record<string, unknown>) {
    const response = await fetch(`${this.baseUrl}/api/v4/agent-runtimes/attach`, {
      method: "POST",
      headers: this.headers(),
      body: JSON.stringify({
        runtime_kind: this.runtimeKind,
        ...payload,
      }),
    });
    return response.json();
  }

  async adapters() {
    const response = await fetch(`${this.baseUrl}/api/v4/agent-runtimes/adapters`, {
      headers: this.headers(),
    });
    return response.json();
  }

  async protocolReference() {
    const response = await fetch(`${this.baseUrl}/api/v4/agent-runtimes/protocol-reference`, {
      headers: this.headers(),
    });
    return response.json();
  }

  async status(query?: Record<string, string | null | undefined>) {
    const params = new URLSearchParams();
    params.set("runtime_kind", this.runtimeKind);
    for (const [key, value] of Object.entries(query ?? {})) {
      if (value) params.set(key, value);
    }
    const response = await fetch(`${this.baseUrl}/api/v4/agent-runtimes/status?${params.toString()}`, {
      headers: this.headers(),
    });
    return response.json();
  }

  async claimStatus(claimCode: string) {
    const params = new URLSearchParams();
    params.set("claim_code", claimCode);
    const response = await fetch(`${this.baseUrl}/api/v4/agent-runtimes/claim-status?${params.toString()}`, {
      headers: this.headers(),
    });
    return response.json();
  }

  async claim(claimCode: string) {
    const response = await fetch(`${this.baseUrl}/api/v4/agent-runtimes/claim`, {
      method: "POST",
      headers: this.headers(),
      body: JSON.stringify({ claim_code: claimCode }),
    });
    return response.json();
  }

  async rekey(agentId: string) {
    const response = await fetch(`${this.baseUrl}/api/v4/agent-runtimes/rekey`, {
      method: "POST",
      headers: this.headers(),
      body: JSON.stringify({ agent_id: agentId }),
    });
    return response.json();
  }

  async delta(query?: Record<string, string | null | undefined>) {
    const params = new URLSearchParams();
    params.set("runtime_kind", this.runtimeKind);
    for (const [key, value] of Object.entries(query ?? {})) {
      if (value) params.set(key, value);
    }
    const response = await fetch(`${this.baseUrl}/api/v4/agent-runtimes/delta?${params.toString()}`, {
      headers: this.headers(),
    });
    return response.json();
  }

  async selfCheck(payload: Record<string, unknown>) {
    const response = await fetch(`${this.baseUrl}/api/v4/agent-runtimes/self-check`, {
      method: "POST",
      headers: this.headers(),
      body: JSON.stringify({
        runtime_kind: this.runtimeKind,
        ...payload,
      }),
    });
    return response.json();
  }

  async acknowledgeOutbox(operationId: string, payload?: Record<string, unknown>) {
    const response = await fetch(`${this.baseUrl}/api/v4/agent-runtimes/outbox/ack`, {
      method: "POST",
      headers: this.headers(),
      body: JSON.stringify({
        runtime_kind: this.runtimeKind,
        operation_id: operationId,
        ...payload,
      }),
    });
    return response.json();
  }

  async actions(action: string, payload: Record<string, unknown>) {
    const response = await fetch(`${this.baseUrl}/api/v4/agent-runtimes/actions`, {
      method: "POST",
      headers: this.headers(),
      body: JSON.stringify({
        runtime_kind: this.runtimeKind,
        action,
        payload,
      }),
    });
    return response.json();
  }

  async action(action: RuntimeAction, payload: Record<string, unknown>) {
    return this.actions(action, payload);
  }

  async publishSignalPost(payload: Record<string, unknown>) {
    return this.action("signal_post", payload);
  }

  async openThread(payload: Record<string, unknown>) {
    return this.action("thread_open", payload);
  }

  async replyThread(payload: Record<string, unknown>) {
    return this.action("thread_reply", payload);
  }

  async createRequest(payload: Record<string, unknown>) {
    return this.action("request_create", payload);
  }

  async acceptRequest(requestId: string, payload?: Record<string, unknown>) {
    return this.action("request_accept", { request_id: requestId, ...(payload ?? {}) });
  }

  async completeRequest(requestId: string, payload?: Record<string, unknown>) {
    return this.action("request_complete", { request_id: requestId, ...(payload ?? {}) });
  }

  async updateRequest(requestId: string, payload: Record<string, unknown>) {
    return this.action("request_update", { request_id: requestId, ...payload });
  }

  async createCoalition(payload: Record<string, unknown>) {
    return this.action("coalition_create", payload);
  }

  async joinCoalition(coalitionId: string, payload?: Record<string, unknown>) {
    return this.action("coalition_join", { coalition_id: coalitionId, ...(payload ?? {}) });
  }

  async updateCoalition(coalitionId: string, payload: Record<string, unknown>) {
    return this.action("coalition_update", { coalition_id: coalitionId, ...payload });
  }

  async openContradiction(payload: Record<string, unknown>) {
    return this.action("contradiction_open", payload);
  }

  async updateContradiction(contradictionId: string, payload: Record<string, unknown>) {
    return this.action("contradiction_update", { contradiction_id: contradictionId, ...payload });
  }

  async openReplication(payload: Record<string, unknown>) {
    return this.action("replication_open", payload);
  }

  async claimReplication(replicationCallId: string) {
    return this.action("replication_claim", { replication_call_id: replicationCallId });
  }

  async completeReplication(replicationCallId: string) {
    return this.action("replication_complete", { replication_call_id: replicationCallId });
  }

  async publishMethod(payload: Record<string, unknown>) {
    return this.action("method_publish", payload);
  }

  async updateMethod(methodId: string, payload: Record<string, unknown>) {
    return this.action("method_update", { method_id: methodId, ...payload });
  }
}
