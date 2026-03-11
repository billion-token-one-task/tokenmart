import { generateApiKey, generateClaimCode, hashKey } from "@/lib/auth/keys";
import {
  claimOpenClawAgent,
  attachOpenClawBridge,
  getOpenClawClaimStatus,
  getOpenClawStatus,
  openClawApiReference,
  recordOpenClawBridgeSelfUpdate,
  rekeyOpenClawAgent,
} from "@/lib/openclaw/connect";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  createSignalPost,
  createArtifactThread,
  createArtifactThreadMessage,
  createCoalition,
  updateCoalition,
  upsertCoalitionMembership,
  createAgentRequest,
  updateAgentRequest,
  createReplicationCall,
  updateReplicationCall,
  createContradictionCluster,
  updateContradictionCluster,
  createMethodCard,
  updateMethodCard,
  upsertSubscription,
} from "@/lib/tokenbook-v3/service";
import type { TokenBookViewer } from "@/lib/tokenbook-v3/types";
import { ensureAccountWallet, ensureAgentWallet } from "@/lib/tokenhall/wallets";
import { lifecycleCapabilityFlags } from "@/lib/auth/agent-lifecycle";
import { getAgentRuntime } from "@/lib/v2/runtime";
import {
  V4_AGENT_RUNTIMES_ACTIONS_ENDPOINT,
  V4_AGENT_RUNTIMES_ADAPTERS_ENDPOINT,
  V4_AGENT_RUNTIMES_ATTACH_ENDPOINT,
  V4_AGENT_RUNTIMES_CLAIM_ENDPOINT,
  V4_AGENT_RUNTIMES_CLAIM_STATUS_ENDPOINT,
  V4_AGENT_RUNTIMES_DELTA_ENDPOINT,
  V4_AGENT_RUNTIMES_OUTBOX_ACK_ENDPOINT,
  V4_AGENT_RUNTIMES_REKEY_ENDPOINT,
  V4_AGENT_RUNTIMES_SELF_CHECK_ENDPOINT,
  V4_AGENT_RUNTIMES_STATUS_ENDPOINT,
} from "@/lib/v2/contracts";
import type { AgentHarness, AgentLifecycleState } from "@/types/auth";
import type { Json } from "@/types/database";
import {
  buildRuntimeA2ACard,
  buildRuntimeMcpManifest,
  buildRuntimeProtocolReference,
  buildRuntimeSdkConfigs,
  buildSidecarConfig,
  listRuntimeAdapters as listAdapterDescriptors,
} from "./adapters";
import type {
  AgentRuntimeAck,
  AgentRuntimeAttachRequest,
  AgentRuntimeAttachResult,
  AgentRuntimeClaimStatus,
  AgentRuntimeDelta,
  AgentRuntimeStatus,
  RuntimeAdapterDescriptor,
  RuntimeCapabilityCard,
  RuntimeClaimState,
  RuntimeDutyMode,
  RuntimeFetchHealth,
  RuntimeKind,
  RuntimeParticipationProfile,
} from "./types";

const APP_URL =
  process.env.NEXT_PUBLIC_APP_URL?.trim().replace(/\/$/, "") || "https://www.tokenmart.net";

type AdminClient = ReturnType<typeof createAdminClient>;
type JsonObject = Record<string, Json | undefined>;

type RuntimeInstanceRow = {
  id: string;
  agent_id: string;
  runtime_kind: string;
  runtime_version: string | null;
  runtime_instance_id: string;
  workspace_or_instance_fingerprint: string;
  claim_state: RuntimeClaimState;
  presence_state: AgentRuntimeStatus["presence_state"];
  scoped_runtime_key_prefix: string | null;
  capability_card: RuntimeCapabilityCard | null;
  participation_profile: RuntimeParticipationProfile | null;
  duty_mode: RuntimeDutyMode | null;
  subscriptions: Array<{ subject_kind: string; subject_id: string }> | null;
  runtime_fetch_health: RuntimeFetchHealth;
  outbox_health: AgentRuntimeStatus["outbox_health"];
  update_status: AgentRuntimeStatus["update_status"];
  degraded_reason: string | null;
  last_attach_at: string | null;
  last_delta_at: string | null;
  last_self_check_at: string | null;
  last_runtime_fetch_at: string | null;
  last_challenge_at: string | null;
  last_outbox_ack_at: string | null;
  last_cursor: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
};

type AgentRow = {
  id: string;
  name: string;
  harness: AgentHarness;
  owner_account_id: string | null;
  bootstrap_account_id?: string | null;
  lifecycle_state: AgentLifecycleState;
  claimed: boolean;
  claim_code: string | null;
  connected_at?: string | null;
  claimed_at?: string | null;
  metadata: Record<string, unknown> | null;
  updated_at: string;
};

function normalizeRuntimeKind(kind: RuntimeKind | null | undefined): RuntimeKind {
  switch (kind) {
    case "kimi_claw":
    case "maxclaw":
    case "manus":
    case "sdk_typescript":
    case "sdk_python":
    case "google_adk":
    case "anthropic_agent_sdk":
    case "claude_code":
    case "microsoft_agent_framework":
    case "browser_operator":
    case "openclaw":
    case "mcp":
    case "a2a":
    case "sidecar":
    case "langgraph":
    case "crewai":
    case "bedrock_agentcore":
    case "openai_background":
    case "custom":
      return kind;
    default:
      return "custom";
  }
}

function runtimeKindToHarness(kind: RuntimeKind): AgentHarness {
  switch (kind) {
    case "kimi_claw":
      return "kimi_claw";
    case "maxclaw":
      return "maxclaw";
    case "manus":
      return "manus";
    case "sdk_typescript":
      return "sdk_ts";
    case "google_adk":
      return "google_adk";
    case "anthropic_agent_sdk":
      return "anthropic_agent_sdk";
    case "claude_code":
      return "claude_code";
    case "microsoft_agent_framework":
      return "microsoft_agent_framework";
    case "browser_operator":
      return "browser_operator";
    default:
      return kind as AgentHarness;
  }
}

function runtimeKindToStorage(kind: RuntimeKind): string {
  switch (kind) {
    case "kimi_claw":
      return "kimi_claw";
    case "maxclaw":
      return "maxclaw";
    case "manus":
      return "manus";
    case "sdk_typescript":
      return "sdk_ts";
    case "google_adk":
      return "google_adk";
    case "anthropic_agent_sdk":
      return "anthropic_agent_sdk";
    case "claude_code":
      return "claude_code";
    case "microsoft_agent_framework":
      return "agent_framework";
    case "browser_operator":
      return "custom";
    default:
      return kind;
  }
}

function storageToRuntimeKind(kind: string | null | undefined): RuntimeKind {
  switch (kind) {
    case "kimi_claw":
      return "kimi_claw";
    case "maxclaw":
      return "maxclaw";
    case "manus":
      return "manus";
    case "sdk_ts":
      return "sdk_typescript";
    case "google_adk":
      return "google_adk";
    case "anthropic_agent_sdk":
      return "anthropic_agent_sdk";
    case "claude_code":
      return "claude_code";
    case "agent_framework":
      return "microsoft_agent_framework";
    case "openclaw":
    case "mcp":
    case "a2a":
    case "sdk_python":
    case "sidecar":
    case "langgraph":
    case "crewai":
    case "bedrock_agentcore":
    case "openai_background":
      return kind;
    default:
      return "custom";
  }
}

function jsonObject(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return value as Record<string, unknown>;
}

function jsonValue(value: unknown): Json {
  if (value === null) return null;
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return value;
  }
  if (Array.isArray(value)) {
    return value.map((entry) => jsonValue(entry)) as Json;
  }
  if (value && typeof value === "object") {
    const normalized: Record<string, Json> = {};
    for (const [key, entry] of Object.entries(value)) {
      normalized[key] = jsonValue(entry);
    }
    return normalized as Json;
  }
  return null;
}

function jsonRecord(value: unknown): Record<string, Json> {
  const normalized = jsonValue(value);
  if (!normalized || typeof normalized !== "object" || Array.isArray(normalized)) return {};
  return normalized as Record<string, Json>;
}

function jsonPayload(value: unknown): JsonObject {
  return jsonRecord(value) as JsonObject;
}

function runtimeViewer(agentId: string, accountId: string | null): TokenBookViewer {
  return {
    account_id: accountId,
    agent_id: agentId,
    accountRole: null,
    permissions: [],
  };
}

async function mintRuntimeKey(input: {
  agentId: string;
  accountId: string | null;
  label: string;
  db: AdminClient;
}) {
  const generatedKey = generateApiKey("tokenmart");
  const apiKey = generatedKey.key;
  const keyPrefix = generatedKey.prefix;
  const keyHash = generatedKey.hash;
  const { error } = await input.db.from("auth_api_keys").insert({
    key_hash: keyHash,
    key_prefix: keyPrefix,
    label: input.label,
    agent_id: input.agentId,
    account_id: input.accountId,
    permissions: ["read", "write"],
    expires_at: null,
    revoked: false,
  });
  if (error) throw error;
  return { api_key: apiKey, key_prefix: keyPrefix };
}

async function loadAgentById(agentId: string, db: AdminClient): Promise<AgentRow | null> {
  const { data, error } = await db
    .from("agents")
    .select(
      "id, name, harness, owner_account_id, bootstrap_account_id, lifecycle_state, claimed, claim_code, connected_at, claimed_at, metadata, updated_at",
    )
    .eq("id", agentId)
    .maybeSingle();
  if (error) throw error;
  return (data as AgentRow | null) ?? null;
}

async function loadAgentByClaimCode(claimCode: string, db: AdminClient): Promise<AgentRow | null> {
  const { data, error } = await db
    .from("agents")
    .select(
      "id, name, harness, owner_account_id, bootstrap_account_id, lifecycle_state, claimed, claim_code, connected_at, claimed_at, metadata, updated_at",
    )
    .eq("claim_code", claimCode)
    .maybeSingle();
  if (error) throw error;
  return (data as AgentRow | null) ?? null;
}

async function loadAccessibleAgents(accountId: string, db: AdminClient): Promise<AgentRow[]> {
  const { data, error } = await db
    .from("agents")
    .select(
      "id, name, harness, owner_account_id, bootstrap_account_id, lifecycle_state, claimed, claim_code, connected_at, claimed_at, metadata, updated_at",
    )
    .or(`owner_account_id.eq.${accountId},bootstrap_account_id.eq.${accountId}`)
    .order("updated_at", { ascending: false });
  if (error) throw error;
  return (data as AgentRow[] | null) ?? [];
}

async function resolveAgentFromApiKey(apiKey: string, db: AdminClient): Promise<AgentRow | null> {
  const { data, error } = await db
    .from("auth_api_keys")
    .select("agent_id, revoked, expires_at")
    .eq("key_hash", hashKey(apiKey))
    .maybeSingle();
  if (error) throw error;
  if (!data?.agent_id || data.revoked) return null;
  if (data.expires_at && new Date(data.expires_at) < new Date()) return null;
  return loadAgentById(data.agent_id, db);
}

async function loadRuntimeInstance(input: {
  db: AdminClient;
  agentId?: string | null;
  runtimeKind?: RuntimeKind | null;
  runtimeInstanceId?: string | null;
  workspaceFingerprint?: string | null;
  profileName?: string | null;
}): Promise<RuntimeInstanceRow | null> {
  const client = input.db;
  let query = client
    .from("agent_runtime_instances" as never)
    .select("*")
    .order("updated_at", { ascending: false });
  if (input.agentId) query = query.eq("agent_id", input.agentId);
  if (input.runtimeKind) query = query.eq("runtime_kind", runtimeKindToStorage(input.runtimeKind));
  if (input.runtimeInstanceId) query = query.eq("runtime_instance_id", input.runtimeInstanceId);
  if (input.workspaceFingerprint) {
    query = query.eq("workspace_or_instance_fingerprint", input.workspaceFingerprint);
  }
  if (input.profileName) {
    query = query.contains("metadata", { profile_name: input.profileName } as never);
  }
  const { data, error } = await query.limit(1).maybeSingle();
  if (error) throw error;
  return (data as RuntimeInstanceRow | null) ?? null;
}

async function upsertRuntimeInstance(
  db: AdminClient,
  input: {
    agentId: string;
    runtimeKind: RuntimeKind;
    runtimeVersion?: string | null;
    runtimeInstanceId: string;
    workspaceFingerprint: string;
    claimState: RuntimeClaimState;
    presenceState: AgentRuntimeStatus["presence_state"];
    scopedRuntimeKeyPrefix?: string | null;
    capabilityCard?: RuntimeCapabilityCard | null;
    participationProfile?: RuntimeParticipationProfile | null;
    dutyMode?: RuntimeDutyMode | null;
    subscriptions?: Array<{ subject_kind: string; subject_id: string }>;
    runtimeFetchHealth?: RuntimeFetchHealth;
    outboxHealth?: AgentRuntimeStatus["outbox_health"];
    updateStatus?: AgentRuntimeStatus["update_status"];
    degradedReason?: string | null;
    lastDeltaAt?: string | null;
    lastSelfCheckAt?: string | null;
    lastRuntimeFetchAt?: string | null;
    lastChallengeAt?: string | null;
    lastOutboxAckAt?: string | null;
    lastCursor?: string | null;
    metadata?: Record<string, unknown>;
  },
) {
  const now = new Date().toISOString();
  const patch = {
    agent_id: input.agentId,
    runtime_kind: runtimeKindToStorage(input.runtimeKind),
    runtime_version: input.runtimeVersion ?? null,
    runtime_instance_id: input.runtimeInstanceId,
    workspace_or_instance_fingerprint: input.workspaceFingerprint,
    claim_state: input.claimState,
    presence_state: input.presenceState,
    scoped_runtime_key_prefix: input.scopedRuntimeKeyPrefix ?? null,
    capability_card: (input.capabilityCard ?? {}) as Json,
    participation_profile: input.participationProfile ?? "ambient_observer",
    duty_mode: input.dutyMode ?? "ambient_watch",
    subscriptions: (input.subscriptions ?? []) as Json,
    runtime_fetch_health: input.runtimeFetchHealth ?? "unknown",
    outbox_health: input.outboxHealth ?? "healthy",
    update_status: input.updateStatus ?? "current",
    degraded_reason: input.degradedReason ?? null,
    last_attach_at: now,
    last_delta_at: input.lastDeltaAt ?? null,
    last_self_check_at: input.lastSelfCheckAt ?? null,
    last_runtime_fetch_at: input.lastRuntimeFetchAt ?? null,
    last_challenge_at: input.lastChallengeAt ?? null,
    last_outbox_ack_at: input.lastOutboxAckAt ?? null,
    last_cursor: input.lastCursor ?? null,
    metadata: (input.metadata ?? {}) as Json,
  };
  const { data, error } = await db
    .from("agent_runtime_instances" as never)
    .upsert(patch as never, {
      onConflict: "agent_id,runtime_kind,workspace_or_instance_fingerprint",
      ignoreDuplicates: false,
    })
    .select("*")
    .single();
  if (error) throw error;
  return data as RuntimeInstanceRow;
}

async function recordOutboxAck(
  db: AdminClient,
  input: {
    runtimeInstanceDbId: string;
    operationId: string;
    actionKind: string;
    payload?: Record<string, unknown>;
    status: AgentRuntimeAck["status"];
    metadata?: Record<string, unknown>;
  },
): Promise<AgentRuntimeAck> {
  const now = new Date().toISOString();
  const payload = {
    ...(input.payload ?? {}),
    status: input.status,
    metadata: input.metadata ?? {},
  };
  const { error } = await db
    .from("agent_runtime_outbox_ops" as never)
    .upsert(
      {
        runtime_instance_id: input.runtimeInstanceDbId,
        operation_id: input.operationId,
        action_kind: input.actionKind,
        payload: payload as Json,
        acked: input.status !== "failed",
        acknowledged_at: now,
        last_error: input.status === "failed" ? String(input.metadata?.error ?? "runtime_failed") : null,
      } as never,
      { onConflict: "runtime_instance_id,operation_id" },
    );
  if (error) throw error;
  return {
    operation_id: input.operationId,
    status: input.status,
    acknowledged_at: now,
    metadata: input.metadata ?? {},
  };
}

function choosePreferredAgent(agents: AgentRow[]): AgentRow | null {
  return agents[0] ?? null;
}

function buildClaimUrl(claimCode: string) {
  return `${APP_URL}/connect/runtime?claim_code=${encodeURIComponent(claimCode)}`;
}

async function pendingLockedRewards(agentId: string, db: AdminClient) {
  const { data, error } = await db
    .from("reward_splits" as never)
    .select("amount_credits")
    .eq("beneficiary_agent_id", agentId)
    .eq("settlement_status", "locked_unclaimed");
  if (error) throw error;
  return ((data as Array<{ amount_credits: number | string | null }> | null) ?? []).reduce(
    (sum, row) => sum + Number(row.amount_credits ?? 0),
    0,
  );
}

function protocolShape() {
  return {
    attach_endpoint: `${APP_URL}${V4_AGENT_RUNTIMES_ATTACH_ENDPOINT}`,
    status_endpoint: `${APP_URL}${V4_AGENT_RUNTIMES_STATUS_ENDPOINT}`,
    delta_endpoint: `${APP_URL}${V4_AGENT_RUNTIMES_DELTA_ENDPOINT}`,
    outbox_ack_endpoint: `${APP_URL}${V4_AGENT_RUNTIMES_OUTBOX_ACK_ENDPOINT}`,
    self_check_endpoint: `${APP_URL}${V4_AGENT_RUNTIMES_SELF_CHECK_ENDPOINT}`,
    claim_status_endpoint: `${APP_URL}${V4_AGENT_RUNTIMES_CLAIM_STATUS_ENDPOINT}`,
    claim_endpoint: `${APP_URL}${V4_AGENT_RUNTIMES_CLAIM_ENDPOINT}`,
    rekey_endpoint: `${APP_URL}${V4_AGENT_RUNTIMES_REKEY_ENDPOINT}`,
    actions_endpoint: `${APP_URL}${V4_AGENT_RUNTIMES_ACTIONS_ENDPOINT}`,
    adapters_endpoint: `${APP_URL}${V4_AGENT_RUNTIMES_ADAPTERS_ENDPOINT}`,
  };
}

function mapOpenClawStatusToGeneric(status: Awaited<ReturnType<typeof getOpenClawStatus>>): AgentRuntimeStatus {
  const bridge = status.bridge;
  return {
    connected: status.connected,
    runtime_kind: "openclaw",
    runtime_version: status.openclaw_version ?? null,
    runtime_instance_id: bridge ? `${bridge.profile_name ?? "default"}:${bridge.workspace_path ?? "workspace"}` : null,
    workspace_or_instance_fingerprint: null,
    claim_state: (status.agent?.lifecycle_state as RuntimeClaimState | undefined) ?? null,
    presence_state: status.rekey_required
      ? "rekey_required"
      : status.runtime_online
        ? "online"
        : status.connected
          ? "degraded"
          : "offline",
    participation_profile: "always_on_worker",
    duty_mode: "ambient_watch",
    scoped_runtime_key: null,
    capability_card: {
      runtime_kind: "openclaw",
      supports_public_writes: true,
      supports_delta_sync: true,
      supports_outbox_replay: true,
      supports_self_update: true,
      supports_claim_later: true,
      collaboration_verbs: [
        "signal_post_publish",
        "thread_open",
        "thread_reply",
        "request_accept",
        "request_complete",
        "coalition_join",
        "contradiction_open",
        "contradiction_update",
        "replication_claim",
        "replication_complete",
        "method_publish",
        "method_update",
      ],
      adapters: ["injector", "bridge"],
      metadata: {},
    },
    capability_flags: status.capability_flags,
    runtime_online: status.runtime_online,
    runtime_fetch_health: status.runtime_fetch_health,
    outbox_health: "healthy",
    update_status: status.update_required
      ? "update_required"
      : status.update_available
        ? "update_available"
        : status.last_update_error
          ? "update_failed"
          : "current",
    first_success_ready: status.first_success_ready,
    last_heartbeat_at: status.last_heartbeat_at,
    last_attach_at: status.last_attach_at,
    last_delta_at: null,
    last_self_check_at: status.last_self_check_at,
    last_runtime_fetch_at: status.last_pulse_at,
    last_pulse_at: status.last_pulse_at,
    last_challenge_at: status.last_heartbeat_at,
    last_outbox_ack_at: null,
    degraded_reason: status.degraded_reason,
    claim_required_for_rewards: status.claim_required_for_rewards,
    pending_locked_rewards: status.pending_locked_rewards,
    claim_url: status.claim_url,
    pulse_freshness: Boolean(status.diagnostics.pulse_recent),
    challenge_freshness: Boolean(status.diagnostics.challenge_fresh),
    self_check_freshness: Boolean(status.diagnostics.self_check_recent),
    manifest_drift: Boolean(status.diagnostics.manifest_drift),
    diagnostics: {
      pulse_freshness: Boolean(status.diagnostics.pulse_recent),
      delta_freshness: Boolean(status.runtime_online),
      challenge_freshness: Boolean(status.diagnostics.challenge_fresh),
      self_check_freshness: Boolean(status.diagnostics.self_check_recent),
      runtime_fetch_health: status.runtime_fetch_health,
      manifest_drift: Boolean(status.diagnostics.manifest_drift),
      update_status: status.update_required
        ? "update_required"
        : status.update_available
          ? "update_available"
          : status.last_update_error
            ? "update_failed"
            : "current",
      degraded_reason: status.degraded_reason,
    },
    agent: status.agent
      ? {
          id: status.agent.id,
          name: status.agent.name,
          harness: "openclaw",
          lifecycle_state: status.agent.lifecycle_state as RuntimeClaimState,
          connected_at: status.agent.connected_at ?? null,
          claimed_at: status.agent.claimed_at ?? null,
        }
      : null,
    subscriptions: [],
    runtime_preview: status.runtime_preview,
  };
}

async function syncDefaultSubscriptions(agentId: string, accountId: string | null, db: AdminClient) {
  const { data, error } = await db
    .from("mountains")
    .select("id")
    .eq("status", "active")
    .eq("visibility", "public")
    .order("updated_at", { ascending: false })
    .limit(3);
  if (error) throw error;
  const viewer = runtimeViewer(agentId, accountId);
  const subscriptions: Array<{ subject_kind: string; subject_id: string }> = [];
  for (const row of data ?? []) {
    await upsertSubscription({
      viewer,
      subjectKind: "mountain",
      subjectId: row.id,
      subscribed: true,
      metadata: { auto_attached: true },
    });
    subscriptions.push({ subject_kind: "mountain", subject_id: row.id });
  }
  return subscriptions;
}

export async function attachAgentRuntime(
  input: AgentRuntimeAttachRequest,
): Promise<AgentRuntimeAttachResult> {
  const runtimeKind = normalizeRuntimeKind(input.runtime_kind);
  if (runtimeKind === "openclaw") {
    const result = await attachOpenClawBridge({
      name: input.name ?? null,
      description: input.description ?? null,
      preferredModel: input.preferred_model ?? null,
      workspacePath: input.workspace_path?.trim() || process.cwd(),
      workspaceFingerprint: input.workspace_or_instance_fingerprint,
      profileName: input.profile_name ?? null,
      openclawHome: input.instance_home ?? null,
      openclawVersion: input.runtime_version ?? null,
      platform: input.platform ?? "macos",
      existingAgentId: input.existing_agent_id ?? null,
      existingApiKey: input.existing_api_key ?? null,
      existingClaimCode: input.existing_claim_code ?? null,
      existingClaimUrl: input.existing_claim_url ?? null,
      metadata: input.metadata ?? null,
    });
    if (!result.agent) {
      throw new Error("OpenClaw attach completed without an attached agent");
    }
    const attachedAgent = result.agent;
    return {
      attached: result.attached,
      runtime_kind: "openclaw",
      runtime_version: input.runtime_version ?? null,
      runtime_instance_id: `${result.profile_name}:${result.workspace_fingerprint}`,
      workspace_or_instance_fingerprint: result.workspace_fingerprint,
      claim_state: attachedAgent.lifecycle_state as RuntimeClaimState,
      presence_state: result.rekey_required ? "rekey_required" : "attached",
      reused_existing_identity: result.reused_existing_identity,
      rekey_required: result.rekey_required,
      claim_url: attachedAgent.claim_url,
      claim_code: result.credentials?.claim_code ?? null,
      agent: {
        id: attachedAgent.id,
        name: attachedAgent.name,
        harness: "openclaw",
        claim_state: attachedAgent.lifecycle_state as RuntimeClaimState,
        key_prefix: attachedAgent.key_prefix,
      },
      runtime_key: result.credentials
        ? { api_key: result.credentials.api_key, key_prefix: attachedAgent.key_prefix }
        : null,
      protocol: protocolShape(),
      compatibility: { openclaw_bridge: openClawApiReference() },
      continuity_bootstrap: {
        subscriptions: [],
        hints: ["The OpenClaw bridge is attached. Start reading runtime deltas and collaboration objects."],
      },
      warnings: result.warnings,
    };
  }

  const db = createAdminClient();
  let agent: AgentRow | null = null;
  let reusedExistingIdentity = false;
  let runtimeKey: { api_key: string | null; key_prefix: string | null } | null = null;

  if (input.existing_api_key?.trim()) {
    agent = await resolveAgentFromApiKey(input.existing_api_key.trim(), db);
    if (agent) {
      reusedExistingIdentity = true;
      runtimeKey = {
        api_key: input.existing_api_key.trim(),
        key_prefix: input.existing_api_key.trim().slice(0, "tokenmart_".length + 8),
      };
    }
  }

  if (!agent && input.existing_agent_id?.trim()) {
    agent = await loadAgentById(input.existing_agent_id.trim(), db);
    if (agent) reusedExistingIdentity = true;
  }

  const runtimeInstanceId =
    input.runtime_instance_id?.trim() ||
    `${runtimeKind}:${input.workspace_or_instance_fingerprint}`;
  const existingInstance =
    !agent
      ? await loadRuntimeInstance({
          db,
          runtimeKind,
          runtimeInstanceId,
          workspaceFingerprint: input.workspace_or_instance_fingerprint,
        })
      : null;
  if (!agent && existingInstance) {
    agent = await loadAgentById(existingInstance.agent_id, db);
    reusedExistingIdentity = Boolean(agent);
  }

  if (!agent) {
    const claimCode = generateClaimCode();
    const harness = runtimeKindToHarness(runtimeKind);
    const { data, error } = await db
      .from("agents")
      .insert({
        name:
          input.name?.trim() ||
          `${runtimeKind.replace(/_/g, "-")}-${input.workspace_or_instance_fingerprint.slice(0, 8)}`,
        description:
          input.description?.trim() ||
          `Universal runtime agent attached via ${runtimeKind} runtime protocol.`,
        harness,
        owner_account_id: null,
        bootstrap_account_id: null,
        claimed: false,
        claim_code: claimCode,
        status: "active",
        lifecycle_state: "registered_unclaimed",
        trust_tier: 0,
        metadata: {
          runtime_kind: runtimeKind,
          runtime_version: input.runtime_version ?? null,
          preferred_model: input.preferred_model ?? null,
          capability_card: input.capability_card ?? {},
          attached_via: "runtime_protocol_v4",
          runtime_instance_id: runtimeInstanceId,
        } as Json,
      } as never)
      .select(
        "id, name, harness, owner_account_id, bootstrap_account_id, lifecycle_state, claimed, claim_code, connected_at, claimed_at, metadata, updated_at",
      )
      .single();
    if (error) throw error;
    agent = data as AgentRow;
  }

  if (!runtimeKey) {
    runtimeKey = await mintRuntimeKey({
      agentId: agent.id,
      accountId: agent.owner_account_id ?? null,
      label: `${agent.name}-${runtimeKind}`,
      db,
    });
  }

  const attachedAgent = agent;
  const attachedRuntimeKey = runtimeKey;
  if (!attachedRuntimeKey) {
    throw new Error("Runtime key minting failed");
  }

  await ensureAgentWallet(attachedAgent.id, attachedAgent.owner_account_id ?? null, db);
  if (attachedAgent.owner_account_id) {
    await ensureAccountWallet(attachedAgent.owner_account_id, db);
  }

  const subscriptions = await syncDefaultSubscriptions(
    attachedAgent.id,
    attachedAgent.owner_account_id ?? null,
    db,
  );
  await upsertRuntimeInstance(db, {
    agentId: attachedAgent.id,
    runtimeKind,
    runtimeVersion: input.runtime_version ?? null,
    runtimeInstanceId,
    workspaceFingerprint: input.workspace_or_instance_fingerprint,
    claimState: attachedAgent.lifecycle_state as RuntimeClaimState,
    presenceState: "attached",
    scopedRuntimeKeyPrefix: attachedRuntimeKey.key_prefix,
    capabilityCard: input.capability_card ?? null,
    participationProfile: input.participation_profile ?? "always_on_worker",
    dutyMode: input.duty_mode ?? "ambient_watch",
    subscriptions,
    metadata: {
      profile_name: input.profile_name ?? null,
      workspace_path: input.workspace_path ?? null,
      instance_home: input.instance_home ?? null,
      platform: input.platform ?? null,
      preferred_model: input.preferred_model ?? null,
      capability_card: input.capability_card ?? {},
      runtime_mode: "universal_runtime_v4",
    },
  });

  return {
    attached: true,
    runtime_kind: runtimeKind,
    runtime_version: input.runtime_version ?? null,
    runtime_instance_id: runtimeInstanceId,
    workspace_or_instance_fingerprint: input.workspace_or_instance_fingerprint,
    claim_state: attachedAgent.lifecycle_state as RuntimeClaimState,
    presence_state: "attached",
    reused_existing_identity: reusedExistingIdentity,
    rekey_required: false,
    claim_url: attachedAgent.claim_code ? buildClaimUrl(attachedAgent.claim_code) : null,
    claim_code: attachedAgent.claim_code,
    agent: {
      id: attachedAgent.id,
      name: attachedAgent.name,
      harness: attachedAgent.harness,
      claim_state: attachedAgent.lifecycle_state as RuntimeClaimState,
      key_prefix: attachedRuntimeKey.key_prefix,
    },
    runtime_key: attachedRuntimeKey,
    protocol: protocolShape(),
    compatibility: { openclaw_bridge: null },
    continuity_bootstrap: {
      subscriptions,
      hints: [
        "You are attached to the TokenBook Runtime Protocol.",
        "Start polling the delta endpoint and maintain a local outbox for writes.",
      ],
    },
    warnings: [],
  };
}

export async function getRuntimeStatus(input: {
  accountId?: string | null;
  agentId?: string | null;
  runtimeKind?: RuntimeKind | null;
  runtimeInstanceId?: string | null;
  profileName?: string | null;
  workspaceFingerprint?: string | null;
}): Promise<AgentRuntimeStatus> {
  if (input.runtimeKind === "openclaw") {
    return mapOpenClawStatusToGeneric(
      await getOpenClawStatus({
        accountId: input.accountId ?? null,
        agentId: input.agentId ?? null,
        profileName: input.profileName ?? null,
        workspaceFingerprint: input.workspaceFingerprint ?? null,
      }),
    );
  }

  const db = createAdminClient();
  let agent: AgentRow | null = null;
  if (input.accountId) {
    const agents = await loadAccessibleAgents(input.accountId, db);
    agent =
      (input.agentId ? agents.find((candidate) => candidate.id === input.agentId) : choosePreferredAgent(agents)) ??
      null;
  } else if (input.agentId) {
    agent = await loadAgentById(input.agentId, db);
  }

  const empty: AgentRuntimeStatus = {
    connected: false,
    runtime_kind: normalizeRuntimeKind(input.runtimeKind),
    runtime_version: null,
    runtime_instance_id: null,
    workspace_or_instance_fingerprint: null,
    claim_state: null,
    presence_state: "offline",
    participation_profile: null,
    duty_mode: null,
    scoped_runtime_key: null,
    capability_card: null,
    capability_flags: lifecycleCapabilityFlags("registered_unclaimed"),
    runtime_online: false,
    runtime_fetch_health: "unknown",
    outbox_health: "healthy",
    update_status: "current",
    first_success_ready: false,
    last_heartbeat_at: null,
    last_attach_at: null,
    last_delta_at: null,
    last_self_check_at: null,
    last_runtime_fetch_at: null,
    last_pulse_at: null,
    last_challenge_at: null,
    last_outbox_ack_at: null,
    degraded_reason: null,
    claim_required_for_rewards: false,
    pending_locked_rewards: 0,
    claim_url: null,
    pulse_freshness: false,
    challenge_freshness: false,
    self_check_freshness: false,
    manifest_drift: false,
    diagnostics: {
      pulse_freshness: false,
      delta_freshness: false,
      challenge_freshness: false,
      self_check_freshness: false,
      runtime_fetch_health: "unknown",
      manifest_drift: false,
      update_status: "current",
      degraded_reason: null,
    },
    agent: null,
    subscriptions: [],
    runtime_preview: null,
  };
  if (!agent) return empty;

  const runtime = await getAgentRuntime(agent.id);
  const instance = await loadRuntimeInstance({
    db,
    agentId: agent.id,
    runtimeKind: input.runtimeKind ?? null,
    runtimeInstanceId: input.runtimeInstanceId ?? null,
    workspaceFingerprint: input.workspaceFingerprint ?? null,
    profileName: input.profileName ?? null,
  });
  const lifecycleState = agent.lifecycle_state;
  const pendingRewards = await pendingLockedRewards(agent.id, db);
  const now = Date.now();
  const pulseFreshness = Boolean(
    instance?.last_runtime_fetch_at && now - new Date(instance.last_runtime_fetch_at).getTime() < 10 * 60 * 1000,
  );
  const selfCheckFreshness = Boolean(
    instance?.last_self_check_at && now - new Date(instance.last_self_check_at).getTime() < 15 * 60 * 1000,
  );
  const challengeFreshness = Boolean(
    instance?.last_challenge_at && now - new Date(instance.last_challenge_at).getTime() < 15 * 60 * 1000,
  );
  const manifestDrift = Boolean(jsonObject(instance?.metadata).manifest_drift);
  const updateStatus =
    (instance?.update_status as AgentRuntimeStatus["update_status"] | undefined) ?? "current";
  const runtimeOnline = Boolean(
    pulseFreshness &&
      selfCheckFreshness &&
      instance?.runtime_fetch_health === "healthy" &&
      instance.presence_state !== "rekey_required",
  );

  return {
    connected: true,
    runtime_kind: storageToRuntimeKind(instance?.runtime_kind) ?? normalizeRuntimeKind(input.runtimeKind),
    runtime_version: instance?.runtime_version ?? null,
    runtime_instance_id: instance?.runtime_instance_id ?? null,
    workspace_or_instance_fingerprint: instance?.workspace_or_instance_fingerprint ?? null,
    claim_state: lifecycleState as RuntimeClaimState,
    presence_state:
      (instance?.presence_state as AgentRuntimeStatus["presence_state"] | undefined) ??
      (runtimeOnline ? "online" : "attached"),
    participation_profile: instance?.participation_profile ?? "always_on_worker",
    duty_mode: instance?.duty_mode ?? "ambient_watch",
    scoped_runtime_key: instance?.scoped_runtime_key_prefix ?? null,
    capability_card: (instance?.capability_card as RuntimeCapabilityCard | null) ?? null,
    capability_flags: lifecycleCapabilityFlags(lifecycleState),
    runtime_online: runtimeOnline,
    runtime_fetch_health: instance?.runtime_fetch_health ?? "unknown",
    outbox_health: instance?.outbox_health ?? "healthy",
    update_status: updateStatus,
    first_success_ready: runtimeOnline,
    last_heartbeat_at: agent.connected_at ?? null,
    last_attach_at: instance?.last_attach_at ?? null,
    last_delta_at: instance?.last_delta_at ?? null,
    last_self_check_at: instance?.last_self_check_at ?? null,
    last_runtime_fetch_at: instance?.last_runtime_fetch_at ?? null,
    last_pulse_at: instance?.last_runtime_fetch_at ?? null,
    last_challenge_at: instance?.last_challenge_at ?? null,
    last_outbox_ack_at: instance?.last_outbox_ack_at ?? null,
    degraded_reason: instance?.degraded_reason ?? null,
    claim_required_for_rewards: lifecycleState !== "claimed",
    pending_locked_rewards: pendingRewards,
    claim_url: agent.claim_code ? buildClaimUrl(agent.claim_code) : null,
    pulse_freshness: pulseFreshness,
    challenge_freshness: challengeFreshness,
    self_check_freshness: selfCheckFreshness,
    manifest_drift: manifestDrift,
    diagnostics: {
      pulse_freshness: pulseFreshness,
      delta_freshness: Boolean(instance?.last_delta_at),
      challenge_freshness: challengeFreshness,
      self_check_freshness: selfCheckFreshness,
      runtime_fetch_health: instance?.runtime_fetch_health ?? "unknown",
      manifest_drift: manifestDrift,
      update_status: updateStatus,
      degraded_reason: instance?.degraded_reason ?? null,
    },
    agent: {
      id: agent.id,
      name: agent.name,
      harness: agent.harness,
      lifecycle_state: lifecycleState as RuntimeClaimState,
      connected_at: agent.connected_at ?? null,
      claimed_at: agent.claimed_at ?? null,
    },
    subscriptions: instance?.subscriptions ?? [],
    runtime_preview: runtime,
  };
}

export async function getRuntimeDelta(input: {
  agentId: string;
  runtimeKind?: RuntimeKind | null;
  runtimeInstanceId?: string | null;
  cursor?: string | null;
}): Promise<AgentRuntimeDelta> {
  const db = createAdminClient();
  const runtime = await getAgentRuntime(input.agentId);
  const status = await getRuntimeStatus({
    agentId: input.agentId,
    runtimeKind: input.runtimeKind ?? null,
    runtimeInstanceId: input.runtimeInstanceId ?? null,
  });
  const cursor = input.cursor?.trim() || new Date().toISOString();
  const runtimeKind = status.runtime_kind ?? normalizeRuntimeKind(input.runtimeKind);
  const runtimeInstanceId =
    status.runtime_instance_id ??
    input.runtimeInstanceId ??
    `${runtimeKind}:${status.workspace_or_instance_fingerprint ?? input.agentId}`;

  const instance =
    (await loadRuntimeInstance({
      db,
      agentId: input.agentId,
      runtimeKind,
      runtimeInstanceId,
    })) ??
    (await upsertRuntimeInstance(db, {
      agentId: input.agentId,
      runtimeKind,
      runtimeVersion: status.runtime_version,
      runtimeInstanceId,
      workspaceFingerprint: status.workspace_or_instance_fingerprint ?? `${input.agentId}:${runtimeKind}`,
      claimState: (status.claim_state ?? "registered_unclaimed") as RuntimeClaimState,
      presenceState: status.presence_state,
      capabilityCard: status.capability_card,
      participationProfile: status.participation_profile ?? "always_on_worker",
      dutyMode: status.duty_mode ?? "ambient_watch",
      subscriptions: status.subscriptions,
      runtimeFetchHealth: "healthy",
      lastDeltaAt: new Date().toISOString(),
      lastRuntimeFetchAt: new Date().toISOString(),
      lastCursor: cursor,
      metadata: {
        local_memory_digest: {
          mountains: runtime.mission_context.mountains.map((mountain) => mountain.id),
          contradictions: (runtime.contradiction_alerts ?? []).map((item) => item.id),
          replications: (runtime.replication_calls ?? []).map((item) => item.id),
          requests: (runtime.structured_requests ?? []).map((item) => item.id),
        },
      },
    }));

  await upsertRuntimeInstance(db, {
    agentId: input.agentId,
    runtimeKind,
    runtimeVersion: status.runtime_version,
    runtimeInstanceId: instance.runtime_instance_id,
    workspaceFingerprint: instance.workspace_or_instance_fingerprint,
    claimState: (status.claim_state ?? "registered_unclaimed") as RuntimeClaimState,
    presenceState: status.runtime_online ? "online" : status.presence_state,
    scopedRuntimeKeyPrefix: status.scoped_runtime_key,
    capabilityCard: status.capability_card,
    participationProfile: status.participation_profile ?? "always_on_worker",
    dutyMode: status.duty_mode ?? "ambient_watch",
    subscriptions: status.subscriptions,
    runtimeFetchHealth: status.runtime_online ? "healthy" : status.runtime_fetch_health,
    lastDeltaAt: new Date().toISOString(),
    lastRuntimeFetchAt: new Date().toISOString(),
    lastCursor: cursor,
    metadata: {
      ...jsonObject(instance.metadata),
      local_memory_digest: {
        active_coalitions: (runtime.coalition_invites ?? []).map((item) => item.id),
        unresolved_contradictions: (runtime.contradiction_alerts ?? []).map((item) => item.id),
        relevant_methods: (runtime.method_recommendations ?? []).map((item) => item.id),
        recent_feed_deltas: (runtime.mountain_feed_deltas ?? []).map((item) => item.id),
        blockers: runtime.blocked_items.map((item) => item.work_spec_id),
      },
    },
  });

  return {
    cursor,
    runtime_kind: runtimeKind,
    runtime_instance_id: runtimeInstanceId,
    feed_deltas: runtime.mountain_feed_deltas ?? [],
    request_deltas: runtime.structured_requests ?? [],
    coalition_deltas: runtime.coalition_invites ?? [],
    thread_mentions: runtime.artifact_thread_mentions ?? [],
    contradiction_deltas: runtime.contradiction_alerts ?? [],
    replication_deltas: runtime.replication_calls ?? [],
    method_deltas: runtime.method_recommendations ?? [],
    continuity_hints: runtime.continuity_hints ?? [],
    assignments: runtime.current_assignments,
    checkpoint_deadlines: runtime.checkpoint_deadlines,
    blocked_items: runtime.blocked_items,
    recommended_speculative_lines: runtime.recommended_speculative_lines,
    mission_context: runtime.mission_context,
    supervisor_messages: runtime.supervisor_messages,
    bootstrap: runtime.bootstrap,
  };
}

export async function acknowledgeRuntimeOutbox(input: {
  agentId: string;
  runtimeKind: RuntimeKind;
  runtimeInstanceId?: string | null;
  operationId: string;
  status: AgentRuntimeAck["status"];
  metadata?: Record<string, unknown>;
}) {
  const db = createAdminClient();
  const instance = await loadRuntimeInstance({
    db,
    agentId: input.agentId,
    runtimeKind: input.runtimeKind,
    runtimeInstanceId: input.runtimeInstanceId ?? null,
  });
  if (!instance) {
    throw new Error("Runtime instance not found for outbox acknowledgement");
  }
  const ack = await recordOutboxAck(db, {
    runtimeInstanceDbId: instance.id,
    operationId: input.operationId,
    actionKind: jsonObject(input.metadata).action_kind ? String(jsonObject(input.metadata).action_kind) : "runtime_action",
    status: input.status,
    metadata: input.metadata,
  });
  await upsertRuntimeInstance(db, {
    agentId: input.agentId,
    runtimeKind: storageToRuntimeKind(instance.runtime_kind),
    runtimeVersion: instance.runtime_version,
    runtimeInstanceId: instance.runtime_instance_id,
    workspaceFingerprint: instance.workspace_or_instance_fingerprint,
    claimState: instance.claim_state,
    presenceState: instance.presence_state,
    scopedRuntimeKeyPrefix: instance.scoped_runtime_key_prefix,
    capabilityCard: instance.capability_card,
    participationProfile: instance.participation_profile ?? "always_on_worker",
    dutyMode: instance.duty_mode ?? "ambient_watch",
    subscriptions: instance.subscriptions ?? [],
    runtimeFetchHealth: instance.runtime_fetch_health,
    outboxHealth: input.status === "failed" ? "degraded" : "healthy",
    updateStatus: instance.update_status,
    degradedReason: input.status === "failed" ? String(input.metadata?.error ?? "runtime_action_failed") : null,
    lastOutboxAckAt: ack.acknowledged_at,
    metadata: { ...jsonObject(instance.metadata) },
  });
  return ack;
}

export async function recordRuntimeSelfCheck(input: {
  agentId: string;
  runtimeKind: RuntimeKind;
  runtimeInstanceId?: string | null;
  runtimeVersion?: string | null;
  profileName?: string | null;
  workspacePath?: string | null;
  instanceHome?: string | null;
  instanceFingerprint?: string | null;
  participationProfile?: RuntimeParticipationProfile | null;
  capabilityCard?: RuntimeCapabilityCard | Record<string, unknown> | null;
  runtimeOnline: boolean;
  runtimeFetchHealth: RuntimeFetchHealth;
  pulseFreshness: "fresh" | "stale";
  challengeFreshness: "fresh" | "stale";
  manifestDrift: boolean;
  hookHealth?: string | null;
  cronHealth?: string | null;
  updateStatus: AgentRuntimeStatus["update_status"];
  updateAvailable?: boolean;
  updateRequired?: boolean;
  lastUpdateAt?: string | null;
  lastUpdateError?: string | null;
  outboxState?: Record<string, unknown>;
  localMemoryDigest?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
}) {
  if (input.runtimeKind === "openclaw") {
    await recordOpenClawBridgeSelfUpdate({
      agentId: input.agentId,
      workspaceFingerprint: input.instanceFingerprint ?? `${input.agentId}:openclaw`,
      profileName: input.profileName ?? "default",
      bridgeVersion: input.runtimeVersion ?? undefined,
      runtimeOnline: input.runtimeOnline,
      workspacePath: input.workspacePath ?? null,
      openclawHome: input.instanceHome ?? null,
      openclawVersion: input.runtimeVersion ?? null,
      cronHealth: input.cronHealth ?? null,
      hookHealth: input.hookHealth ?? null,
      metadata: {
        runtime_fetch_health: input.runtimeFetchHealth,
        degraded_reason: input.runtimeFetchHealth === "degraded" ? "runtime_fetch_failed" : null,
        ...input.metadata,
      },
      updateAvailable: input.updateAvailable ?? false,
      updateRequired: input.updateRequired ?? false,
      lastUpdateAt: input.lastUpdateAt ?? null,
      lastUpdateError: input.lastUpdateError ?? null,
      lastUpdateOutcome:
        input.updateStatus === "current" ? "current" : input.updateStatus === "update_failed" ? "failed" : "checked",
    });
  }

  const db = createAdminClient();
  const agent = await loadAgentById(input.agentId, db);
  if (!agent) throw new Error("Agent not found");
  const runtimeKind = normalizeRuntimeKind(input.runtimeKind);
  const runtimeInstanceId =
    input.runtimeInstanceId?.trim() ||
    `${runtimeKind}:${input.instanceFingerprint ?? input.agentId}`;
  const instance = await upsertRuntimeInstance(db, {
    agentId: input.agentId,
    runtimeKind,
    runtimeVersion: input.runtimeVersion ?? null,
    runtimeInstanceId,
    workspaceFingerprint: input.instanceFingerprint ?? `${input.agentId}:${runtimeKind}`,
    claimState: agent.lifecycle_state as RuntimeClaimState,
    presenceState:
      agent.lifecycle_state === "claimed" && input.runtimeFetchHealth === "rekey_required"
        ? "rekey_required"
        : input.runtimeOnline
          ? "online"
          : input.runtimeFetchHealth === "degraded"
            ? "degraded"
            : "attached",
    capabilityCard: (input.capabilityCard as RuntimeCapabilityCard | null) ?? null,
    participationProfile: input.participationProfile ?? "always_on_worker",
    dutyMode: "ambient_watch",
    subscriptions: [],
    runtimeFetchHealth: input.runtimeFetchHealth,
    outboxHealth:
      jsonObject(input.outboxState).health === "degraded" ? "degraded" : "healthy",
    updateStatus: input.updateStatus,
    degradedReason:
      input.runtimeFetchHealth === "degraded"
        ? String(input.metadata?.degraded_reason ?? "runtime_fetch_failed")
        : input.lastUpdateError ?? null,
    lastSelfCheckAt: new Date().toISOString(),
    lastRuntimeFetchAt:
      input.runtimeFetchHealth === "healthy" ? new Date().toISOString() : null,
    lastChallengeAt: input.challengeFreshness === "fresh" ? new Date().toISOString() : null,
    metadata: {
      ...jsonObject(input.metadata),
      profile_name: input.profileName ?? null,
      workspace_path: input.workspacePath ?? null,
      instance_home: input.instanceHome ?? null,
      hook_health: input.hookHealth ?? null,
      cron_health: input.cronHealth ?? null,
      pulse_freshness: input.pulseFreshness,
      challenge_freshness: input.challengeFreshness,
      manifest_drift: input.manifestDrift,
      update_available: input.updateAvailable ?? false,
      update_required: input.updateRequired ?? false,
      last_update_at: input.lastUpdateAt ?? null,
      last_update_error: input.lastUpdateError ?? null,
      outbox_state: input.outboxState ?? {},
      local_memory_digest: input.localMemoryDigest ?? {},
    },
  });
  return instance;
}

export async function getRuntimeClaimStatus(input: { claimCode: string }): Promise<AgentRuntimeClaimStatus> {
  const openclaw = await getOpenClawClaimStatus({ claimCode: input.claimCode }).catch(() => null);
  if (openclaw) {
    return {
      agent_name: openclaw.agent_name,
      harness: "openclaw",
      claim_state: openclaw.lifecycle_state as RuntimeClaimState,
      connected: openclaw.connected,
      last_heartbeat_at: openclaw.last_heartbeat_at,
      pending_locked_rewards: openclaw.pending_locked_rewards,
      claimable: openclaw.claimable,
      claim_url: openclaw.claim_url,
    };
  }

  const db = createAdminClient();
  const agent = await loadAgentByClaimCode(input.claimCode, db);
  if (!agent) throw new Error("Invalid claim code");
  const locked = await pendingLockedRewards(agent.id, db);
  return {
    agent_name: agent.name,
    harness: agent.harness,
    claim_state: agent.lifecycle_state as RuntimeClaimState,
    connected: Boolean(agent.connected_at),
    last_heartbeat_at: agent.connected_at ?? null,
    pending_locked_rewards: locked,
    claimable: !agent.claimed && Boolean(agent.claim_code),
    claim_url: agent.claim_code ? buildClaimUrl(agent.claim_code) : null,
  };
}

export async function claimRuntimeAgent(input: { accountId: string; claimCode: string }) {
  const openclaw = await loadAgentByClaimCode(input.claimCode, createAdminClient());
  if (openclaw?.harness === "openclaw") {
    return claimOpenClawAgent({ accountId: input.accountId, claimCode: input.claimCode });
  }

  const db = createAdminClient();
  const agent = await loadAgentByClaimCode(input.claimCode, db);
  if (!agent) throw new Error("Invalid claim code");
  if (agent.owner_account_id && agent.owner_account_id !== input.accountId) {
    throw new Error("This runtime agent is already claimed by another account");
  }
  const now = new Date().toISOString();
  const { data, error } = await db
    .from("agents")
    .update({
      owner_account_id: input.accountId,
      claimed: true,
      claim_code: null,
      lifecycle_state: "claimed",
      claimed_at: now,
      updated_at: now,
    })
    .eq("id", agent.id)
    .eq("claim_code", input.claimCode)
    .select("id")
    .maybeSingle();
  if (error || !data) throw new Error("This runtime agent has already been claimed");

  await Promise.all([
    ensureAccountWallet(input.accountId, db),
    ensureAgentWallet(agent.id, input.accountId, db),
    db
      .from("reward_splits" as never)
      .update({
        settlement_status: "claim_ready",
        beneficiary_account_id: input.accountId,
      } as never)
      .eq("beneficiary_agent_id", agent.id)
      .eq("settlement_status", "locked_unclaimed"),
    db
      .from("auth_api_keys")
      .update({ account_id: input.accountId } as never)
      .eq("agent_id", agent.id)
      .is("account_id", null),
  ]);

  return getRuntimeStatus({ accountId: input.accountId, agentId: agent.id });
}

export async function rekeyRuntimeAgent(input: { accountId: string; agentId: string }) {
  const db = createAdminClient();
  const agent = await loadAgentById(input.agentId, db);
  if (!agent) throw new Error("Agent not found");
  if (agent.harness === "openclaw") {
    return rekeyOpenClawAgent({ accountId: input.accountId, agentId: input.agentId });
  }
  if (agent.owner_account_id !== input.accountId || agent.lifecycle_state !== "claimed") {
    throw new Error("Only the claimed owner can rekey this runtime agent");
  }

  await db
    .from("auth_api_keys")
    .update({ revoked: true } as never)
    .eq("agent_id", agent.id)
    .eq("revoked", false);
  const runtimeKey = await mintRuntimeKey({
    agentId: agent.id,
    accountId: input.accountId,
    label: `${agent.name}-${agent.harness}-rekey`,
    db,
  });
  return {
    agent_id: agent.id,
    agent_name: agent.name,
    lifecycle_state: agent.lifecycle_state,
    key_prefix: runtimeKey.key_prefix,
    api_key: runtimeKey.api_key,
    expires_at: null,
    claim_url: null,
    protocol: protocolShape(),
  };
}

type RuntimeActionInput = {
  agentId: string;
  accountId?: string | null;
  action: string;
  payload: Record<string, unknown>;
};

function optionalJsonObject(value: unknown): Record<string, unknown> | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) return undefined;
  return value as Record<string, unknown>;
}

export async function performRuntimeAction(input: RuntimeActionInput) {
  const viewer = runtimeViewer(input.agentId, input.accountId ?? null);
  switch (input.action) {
    case "signal_post_publish":
      return createSignalPost({
        viewer,
        mountainId: typeof input.payload.mountain_id === "string" ? input.payload.mountain_id : null,
        campaignId: typeof input.payload.campaign_id === "string" ? input.payload.campaign_id : null,
        artifactThreadId:
          typeof input.payload.artifact_thread_id === "string" ? input.payload.artifact_thread_id : null,
        coalitionSessionId:
          typeof input.payload.coalition_session_id === "string"
            ? input.payload.coalition_session_id
            : null,
        contradictionClusterId:
          typeof input.payload.contradiction_cluster_id === "string"
            ? input.payload.contradiction_cluster_id
            : null,
        replicationCallId:
          typeof input.payload.replication_call_id === "string" ? input.payload.replication_call_id : null,
        methodCardId: typeof input.payload.method_card_id === "string" ? input.payload.method_card_id : null,
        signalType: typeof input.payload.signal_type === "string" ? input.payload.signal_type : "update",
        headline: typeof input.payload.headline === "string" ? input.payload.headline : "Runtime signal",
        body: typeof input.payload.body === "string" ? input.payload.body : "",
        tags: Array.isArray(input.payload.tags) ? input.payload.tags.map(String) : [],
      });
    case "thread_open":
      return createArtifactThread({
        viewer,
        mountainId: String(input.payload.mountain_id),
        campaignId: typeof input.payload.campaign_id === "string" ? input.payload.campaign_id : null,
        workSpecId: typeof input.payload.work_spec_id === "string" ? input.payload.work_spec_id : null,
        deliverableId:
          typeof input.payload.deliverable_id === "string" ? input.payload.deliverable_id : null,
        verificationRunId:
          typeof input.payload.verification_run_id === "string"
            ? input.payload.verification_run_id
            : null,
        contradictionClusterId:
          typeof input.payload.contradiction_cluster_id === "string"
            ? input.payload.contradiction_cluster_id
            : null,
        replicationCallId:
          typeof input.payload.replication_call_id === "string" ? input.payload.replication_call_id : null,
        methodCardId: typeof input.payload.method_card_id === "string" ? input.payload.method_card_id : null,
        threadType: typeof input.payload.thread_type === "string" ? input.payload.thread_type : "artifact",
        title: String(input.payload.title),
        summary: String(input.payload.summary),
      });
    case "thread_reply":
      return createArtifactThreadMessage(viewer, String(input.payload.thread_id), {
        message_type:
          typeof input.payload.message_type === "string" ? input.payload.message_type : "summary",
        body: String(input.payload.body ?? ""),
        parent_message_id:
          typeof input.payload.parent_message_id === "string" ? input.payload.parent_message_id : null,
        payload: jsonObject(input.payload.payload),
      });
    case "coalition_create":
      return createCoalition({
        viewer,
        mountainId: String(input.payload.mountain_id),
        campaignId: typeof input.payload.campaign_id === "string" ? input.payload.campaign_id : null,
        workSpecId: typeof input.payload.work_spec_id === "string" ? input.payload.work_spec_id : null,
        swarmSessionId:
          typeof input.payload.swarm_session_id === "string" ? input.payload.swarm_session_id : null,
        title: String(input.payload.title),
        objective: String(input.payload.objective),
      });
    case "coalition_join":
      return upsertCoalitionMembership(String(input.payload.coalition_id), viewer, {
        status: typeof input.payload.status === "string" ? input.payload.status : "active",
        role_slot: typeof input.payload.role_slot === "string" ? input.payload.role_slot : "contributor",
        share_bps: typeof input.payload.share_bps === "number" ? input.payload.share_bps : null,
        reliability_note:
          typeof input.payload.reliability_note === "string" ? input.payload.reliability_note : null,
        metadata: jsonObject(input.payload.metadata),
      });
    case "coalition_update":
      return updateCoalition(String(input.payload.coalition_id), viewer, {
        title: typeof input.payload.title === "string" ? input.payload.title : undefined,
        objective: typeof input.payload.objective === "string" ? input.payload.objective : undefined,
        status: typeof input.payload.status === "string" ? input.payload.status : undefined,
        reward_split_policy: optionalJsonObject(input.payload.reward_split_policy),
        escalation_policy: optionalJsonObject(input.payload.escalation_policy),
        live_status: optionalJsonObject(input.payload.live_status),
      });
    case "request_create":
      return createAgentRequest({
        viewer,
        mountainId: String(input.payload.mountain_id),
        campaignId: typeof input.payload.campaign_id === "string" ? input.payload.campaign_id : null,
        workSpecId: typeof input.payload.work_spec_id === "string" ? input.payload.work_spec_id : null,
        deliverableId:
          typeof input.payload.deliverable_id === "string" ? input.payload.deliverable_id : null,
        verificationRunId:
          typeof input.payload.verification_run_id === "string"
            ? input.payload.verification_run_id
            : null,
        contradictionClusterId:
          typeof input.payload.contradiction_cluster_id === "string"
            ? input.payload.contradiction_cluster_id
            : null,
        coalitionSessionId:
          typeof input.payload.coalition_session_id === "string"
            ? input.payload.coalition_session_id
            : null,
        requestType:
          typeof input.payload.request_type === "string" ? input.payload.request_type : "ask_for_help",
        title: String(input.payload.title),
        summary: String(input.payload.summary),
        roleNeeded: typeof input.payload.role_needed === "string" ? input.payload.role_needed : null,
        targetAgentId:
          typeof input.payload.target_agent_id === "string" ? input.payload.target_agent_id : null,
        rewardContext: jsonPayload(input.payload.reward_context),
        capabilityRequirements: jsonPayload(input.payload.capability_requirements),
        freeformNote:
          typeof input.payload.freeform_note === "string" ? input.payload.freeform_note : null,
        expiresAt: typeof input.payload.expires_at === "string" ? input.payload.expires_at : null,
      });
    case "request_accept":
      return updateAgentRequest(String(input.payload.request_id), viewer, {
        status: "accepted",
        freeform_note:
          typeof input.payload.freeform_note === "string" ? input.payload.freeform_note : null,
      });
    case "request_complete":
      return updateAgentRequest(String(input.payload.request_id), viewer, {
        status: "completed",
        freeform_note:
          typeof input.payload.freeform_note === "string" ? input.payload.freeform_note : null,
      });
    case "request_update":
      return updateAgentRequest(String(input.payload.request_id), viewer, {
        status: typeof input.payload.status === "string" ? input.payload.status : undefined,
        urgency: typeof input.payload.urgency === "string" ? input.payload.urgency : undefined,
        role_needed:
          typeof input.payload.role_needed === "string" ? input.payload.role_needed : undefined,
        target_agent_id:
          typeof input.payload.target_agent_id === "string"
            ? input.payload.target_agent_id
            : undefined,
        freeform_note:
          typeof input.payload.freeform_note === "string" ? input.payload.freeform_note : undefined,
        reward_context: optionalJsonObject(input.payload.reward_context),
        capability_requirements: optionalJsonObject(input.payload.capability_requirements),
        expires_at:
          typeof input.payload.expires_at === "string" ? input.payload.expires_at : undefined,
      });
    case "replication_open":
      return createReplicationCall({
        viewer,
        mountainId: String(input.payload.mountain_id),
        campaignId: typeof input.payload.campaign_id === "string" ? input.payload.campaign_id : null,
        workSpecId: typeof input.payload.work_spec_id === "string" ? input.payload.work_spec_id : null,
        deliverableId:
          typeof input.payload.deliverable_id === "string" ? input.payload.deliverable_id : null,
        verificationRunId:
          typeof input.payload.verification_run_id === "string"
            ? input.payload.verification_run_id
            : null,
        contradictionClusterId:
          typeof input.payload.contradiction_cluster_id === "string"
            ? input.payload.contradiction_cluster_id
            : null,
        title: String(input.payload.title),
        summary: String(input.payload.summary),
        domainTags: Array.isArray(input.payload.domain_tags) ? input.payload.domain_tags.map(String) : [],
        rewardCredits:
          typeof input.payload.reward_credits === "number" || typeof input.payload.reward_credits === "string"
            ? String(input.payload.reward_credits)
            : "0",
      });
    case "replication_claim":
      return updateReplicationCall(String(input.payload.replication_call_id), viewer, { status: "claimed" });
    case "replication_complete":
      return updateReplicationCall(String(input.payload.replication_call_id), viewer, { status: "completed" });
    case "contradiction_open":
      return createContradictionCluster({
        viewer,
        mountainId: String(input.payload.mountain_id),
        campaignId: typeof input.payload.campaign_id === "string" ? input.payload.campaign_id : null,
        workSpecId: typeof input.payload.work_spec_id === "string" ? input.payload.work_spec_id : null,
        title: String(input.payload.title),
        summary: String(input.payload.summary),
        severity: typeof input.payload.severity === "string" ? input.payload.severity : "medium",
        linkedDeliverableIds: Array.isArray(input.payload.linked_deliverable_ids)
          ? input.payload.linked_deliverable_ids.map(String)
          : [],
        linkedVerificationRunIds: Array.isArray(input.payload.linked_verification_run_ids)
          ? input.payload.linked_verification_run_ids.map(String)
          : [],
      });
    case "contradiction_update":
      return updateContradictionCluster(String(input.payload.contradiction_id), viewer, {
        status: typeof input.payload.status === "string" ? input.payload.status : undefined,
        severity:
          typeof input.payload.severity === "string" || typeof input.payload.severity === "number"
            ? input.payload.severity
            : undefined,
        summary: typeof input.payload.summary === "string" ? input.payload.summary : undefined,
        adjudication_notes: jsonObject(input.payload.adjudication_notes),
      });
    case "method_publish":
      return createMethodCard({
        viewer,
        mountainId: typeof input.payload.mountain_id === "string" ? input.payload.mountain_id : null,
        campaignId: typeof input.payload.campaign_id === "string" ? input.payload.campaign_id : null,
        title: String(input.payload.title),
        summary: String(input.payload.summary),
        body: String(input.payload.body),
        domainTags: Array.isArray(input.payload.domain_tags) ? input.payload.domain_tags.map(String) : [],
        roleTags: Array.isArray(input.payload.role_tags) ? input.payload.role_tags.map(String) : [],
        linkedDeliverableIds: Array.isArray(input.payload.linked_deliverable_ids)
          ? input.payload.linked_deliverable_ids.map(String)
          : [],
        linkedVerificationRunIds: Array.isArray(input.payload.linked_verification_run_ids)
          ? input.payload.linked_verification_run_ids.map(String)
          : [],
      });
    case "method_update":
      return updateMethodCard(String(input.payload.method_id), viewer, {
        title: typeof input.payload.title === "string" ? input.payload.title : undefined,
        summary: typeof input.payload.summary === "string" ? input.payload.summary : undefined,
        body: typeof input.payload.body === "string" ? input.payload.body : undefined,
        status: typeof input.payload.status === "string" ? input.payload.status : undefined,
        reuse_count:
          typeof input.payload.reuse_count === "string" || typeof input.payload.reuse_count === "number"
            ? input.payload.reuse_count
            : undefined,
        usefulness_score:
          typeof input.payload.usefulness_score === "string" ||
          typeof input.payload.usefulness_score === "number"
            ? input.payload.usefulness_score
            : undefined,
        outcome_summary: jsonObject(input.payload.outcome_summary),
      });
    default:
      throw new Error(`Unsupported runtime action: ${input.action}`);
  }
}

export function listRuntimeAdapters(): RuntimeAdapterDescriptor[] {
  return listAdapterDescriptors();
}

export {
  buildRuntimeMcpManifest,
  buildRuntimeA2ACard,
  buildRuntimeProtocolReference,
  buildRuntimeSdkConfigs,
  buildSidecarConfig,
};
