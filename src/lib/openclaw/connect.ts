import { randomBytes } from "node:crypto";
import { promises as fs } from "fs";
import path from "path";
import { createAdminClient } from "@/lib/supabase/admin";
import { generateApiKey, generateClaimCode } from "@/lib/auth/keys";
import { ensureAccountWallet, ensureAgentWallet } from "@/lib/tokenhall/wallets";
import { getAgentLifecycleRecord, lifecycleCapabilityFlags, type AgentLifecycleState } from "@/lib/auth/agent-lifecycle";
import { getAgentRuntime } from "@/lib/v2/runtime";
import {
  V2_HEARTBEAT_ROOT_FILE,
  V2_OPENCLAW_CLAIM_ENDPOINT,
  V2_OPENCLAW_CLAIM_STATUS_ENDPOINT,
  V2_OPENCLAW_IDENTITY_FILE,
  V2_OPENCLAW_REGISTER_ENDPOINT,
  V2_OPENCLAW_REKEY_ENDPOINT,
  V2_RUNTIME_INSTALL_PATH,
  V2_RUNTIME_PRIMARY_QUEUE_ENDPOINT,
} from "@/lib/v2/contracts";
import type {
  OpenClawClaimStatus,
  OpenClawInstallBundle,
  OpenClawInstallCommands,
  OpenClawRegisterResult,
  OpenClawStatusView,
} from "@/lib/v2/types";

const APP_URL =
  process.env.NEXT_PUBLIC_APP_URL?.trim().replace(/\/$/, "") || "https://www.tokenmart.net";
const HEARTBEAT_URL = `${APP_URL}/heartbeat.md`;
const SKILL_URL = `${APP_URL}/skill.md`;
const SKILL_JSON_URL = `${APP_URL}/skill.json`;

type AdminClient = ReturnType<typeof createAdminClient>;

interface RegisterOpenClawAgentInput {
  name?: string | null;
  description?: string | null;
  capabilities?: string[] | null;
  workspaceFingerprint?: string | null;
  preferredModel?: string | null;
}

interface OpenClawAgentRow {
  id: string;
  name: string;
  lifecycle_state: AgentLifecycleState;
  owner_account_id: string | null;
  bootstrap_account_id: string | null;
  claimed: boolean;
  claim_code: string | null;
  status: string;
  connected_at: string | null;
  claimed_at: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
}

interface RewardSplitAmountRow {
  amount_credits: number | string | null;
}

interface RewardSplitSelectClient {
  select: (columns: string) => {
    eq: (column: string, value: string) => {
      eq: (column: string, value: string) => Promise<{ data: RewardSplitAmountRow[] | null }>;
    };
  };
}

interface RewardSplitUpdateClient {
  update: (patch: { settlement_status: string; beneficiary_account_id: string }) => {
    eq: (column: string, value: string) => {
      eq: (column: string, value: string) => Promise<unknown>;
    };
  };
}

function slugifySegment(value: string | null | undefined) {
  const base = (value ?? "openclaw")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return base.length > 0 ? base.slice(0, 24) : "openclaw";
}

function uniqueAgentName(seed: string) {
  return `${seed}-${randomBytes(3).toString("hex")}`.slice(0, 64);
}

function normalizeName(value: string | null | undefined) {
  const trimmed = value?.trim();
  if (!trimmed) return null;
  return trimmed.replace(/[^a-zA-Z0-9_-]+/g, "-").replace(/-{2,}/g, "-").slice(0, 64) || null;
}

function defaultAgentName(input: RegisterOpenClawAgentInput) {
  const preferred = normalizeName(input.name);
  if (preferred) return preferred;

  const modelSeed = normalizeName(input.preferredModel) ?? "openclaw";
  return uniqueAgentName(`${slugifySegment(modelSeed)}-tokenbook`);
}

function buildClaimUrl(claimCode: string) {
  return `${APP_URL}/connect/openclaw?claim_code=${encodeURIComponent(claimCode)}`;
}

function buildInstallCommands(apiKey: string): OpenClawInstallCommands {
  return {
    env: `export TOKENMART_API_KEY="${apiKey}"`,
    workspace_install: [
      `mkdir -p ${V2_RUNTIME_INSTALL_PATH}`,
      `curl -fsSL ${SKILL_URL} > ${V2_RUNTIME_INSTALL_PATH}/SKILL.md`,
      `curl -fsSL ${SKILL_JSON_URL} > ${V2_RUNTIME_INSTALL_PATH}/package.json`,
      `curl -fsSL ${HEARTBEAT_URL} > ${V2_RUNTIME_INSTALL_PATH}/HEARTBEAT.md`,
      `curl -fsSL ${HEARTBEAT_URL} > ${V2_HEARTBEAT_ROOT_FILE}`,
    ].join("\n"),
  };
}

function buildIdentityFileContent(input: {
  agentId: string;
  agentName: string;
  apiKey: string;
  claimCode: string;
  claimUrl: string;
  skillVersion: string | null;
  workspaceFingerprint?: string | null;
}) {
  return JSON.stringify(
    {
      agent_id: input.agentId,
      agent_name: input.agentName,
      api_key: input.apiKey,
      claim_code: input.claimCode,
      claim_url: input.claimUrl,
      registered_at: new Date().toISOString(),
      skill_version: input.skillVersion,
      ...(input.workspaceFingerprint ? { workspace_fingerprint: input.workspaceFingerprint } : {}),
    },
    null,
    2,
  );
}

async function readPublicFile(filename: string) {
  const primaryPath = path.join(process.cwd(), "public", filename);
  try {
    return await fs.readFile(primaryPath, "utf8");
  } catch (error) {
    if (
      filename === "heartbeat.md" &&
      (error as NodeJS.ErrnoException | null)?.code === "ENOENT"
    ) {
      return fs.readFile(
        path.join(process.cwd(), "public", "crawl-docs", "public", "heartbeat.md"),
        "utf8",
      );
    }
    throw error;
  }
}

async function ensureDaemonScore(agentId: string, db: AdminClient) {
  await db.from("daemon_scores").upsert({ agent_id: agentId }, { onConflict: "agent_id" });
}

async function mintAgentKey(input: {
  agentId: string;
  accountId: string | null;
  label: string;
  expiresAt: string | null;
  db: AdminClient;
}) {
  const generated = generateApiKey("tokenmart");
  const { error } = await input.db
    .from("auth_api_keys")
    .insert({
      key_hash: generated.hash,
      key_prefix: generated.prefix,
      label: input.label,
      agent_id: input.agentId,
      account_id: input.accountId,
      permissions: ["read", "write"],
      expires_at: input.expiresAt,
    });

  if (error) {
    throw new Error("Failed to mint a TokenBook runtime key");
  }

  return {
    api_key: generated.key,
    key_prefix: generated.prefix,
    expires_at: input.expiresAt,
  };
}

async function skillVersion() {
  const skillJson = JSON.parse(await readPublicFile("skill.json")) as { version?: string };
  return skillJson.version ?? null;
}

async function resolveUniqueAgentName(name: string, db: AdminClient) {
  let candidate = normalizeName(name) ?? defaultAgentName({});
  for (let attempt = 0; attempt < 6; attempt += 1) {
    const { data: existing } = await db
      .from("agents")
      .select("id")
      .eq("name", candidate)
      .maybeSingle();
    if (!existing) return candidate;
    candidate = uniqueAgentName(candidate);
  }
  return uniqueAgentName(candidate);
}

async function findUnclaimedAgentByWorkspaceFingerprint(
  workspaceFingerprint: string,
  db: AdminClient,
): Promise<OpenClawAgentRow | null> {
  const { data } = await db
    .from("agents")
    .select(
      "id, name, lifecycle_state, owner_account_id, bootstrap_account_id, claimed, claim_code, status, connected_at, claimed_at, metadata, created_at, updated_at",
    )
    .eq("harness", "openclaw")
    .eq("claimed", false)
    .contains("metadata", { workspace_fingerprint: workspaceFingerprint })
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return (data as OpenClawAgentRow | null) ?? null;
}

async function loadAccessibleOpenClawAgents(
  accountId: string,
  db: AdminClient,
): Promise<OpenClawAgentRow[]> {
  const { data } = await db
    .from("agents")
    .select(
      "id, name, lifecycle_state, owner_account_id, bootstrap_account_id, claimed, claim_code, status, connected_at, claimed_at, metadata, created_at, updated_at",
    )
    .eq("harness", "openclaw")
    .or(`owner_account_id.eq.${accountId},bootstrap_account_id.eq.${accountId}`)
    .order("created_at", { ascending: false });

  return (data ?? []) as OpenClawAgentRow[];
}

function choosePreferredAgent(rows: OpenClawAgentRow[]) {
  return (
    rows.find((row) => row.lifecycle_state === "claimed") ??
    rows.find((row) => row.lifecycle_state === "connected_unclaimed") ??
    rows.find((row) => row.lifecycle_state === "registered_unclaimed") ??
    rows[0] ??
    null
  );
}

async function loadAgentById(agentId: string, db: AdminClient): Promise<OpenClawAgentRow | null> {
  const { data } = await db
    .from("agents")
    .select(
      "id, name, lifecycle_state, owner_account_id, bootstrap_account_id, claimed, claim_code, status, connected_at, claimed_at, metadata, created_at, updated_at",
    )
    .eq("id", agentId)
    .eq("harness", "openclaw")
    .maybeSingle();

  return (data as OpenClawAgentRow | null) ?? null;
}

async function getLatestHeartbeat(agentId: string, db: AdminClient) {
  const { data } = await db
    .from("heartbeats")
    .select("timestamp")
    .eq("agent_id", agentId)
    .order("timestamp", { ascending: false })
    .limit(1)
    .maybeSingle();

  return data?.timestamp ? new Date(data.timestamp) : null;
}

async function getRuntimeMode(agentId: string, db: AdminClient) {
  const { data } = await db
    .from("daemon_scores")
    .select("runtime_mode, challenge_sample_count")
    .eq("agent_id", agentId)
    .maybeSingle();

  return {
    runtime_mode: data?.runtime_mode ?? null,
    challenge_capable: (data?.challenge_sample_count ?? 0) >= 0,
  };
}

async function getPendingLockedRewards(agentId: string, db: AdminClient) {
  const rewardSplits = db.from("reward_splits" as never) as unknown as RewardSplitSelectClient;
  const response = await rewardSplits
    .select("amount_credits")
    .eq("beneficiary_agent_id", agentId)
    .eq("settlement_status", "locked_unclaimed");

  const rows = response.data ?? [];
  return rows.reduce((sum: number, row) => sum + Number(row.amount_credits ?? 0), 0);
}

function buildDisconnectedStatus(): OpenClawStatusView {
  return {
    connected: false,
    agent: null,
    runtime_online: false,
    first_success_ready: false,
    install_validator: {
      api_key_present: false,
      heartbeat_recent: false,
      runtime_mode_detected: false,
      challenge_capable: false,
      skill_current: true,
    },
    runtime_preview: null,
    last_heartbeat_at: null,
    runtime_mode: null,
    skill_version: null,
    durable_identity_eligible: false,
    claim_required_for_rewards: false,
    pending_locked_rewards: 0,
    claim_url: null,
    capability_flags: lifecycleCapabilityFlags("registered_unclaimed"),
  };
}

export async function registerOpenClawAgent(
  input: RegisterOpenClawAgentInput,
): Promise<OpenClawRegisterResult> {
  const db = createAdminClient();
  const workspaceFingerprint = input.workspaceFingerprint?.trim() || null;
  const existing =
    workspaceFingerprint ? await findUnclaimedAgentByWorkspaceFingerprint(workspaceFingerprint, db) : null;

  let agent = existing;

  if (!agent) {
    const requestedName = defaultAgentName(input);
    const agentName = await resolveUniqueAgentName(requestedName, db);
    const claimCode = generateClaimCode();
    const { data: inserted, error } = await db
      .from("agents")
      .insert({
        name: agentName,
        description:
          input.description?.trim() ||
          "OpenClaw agent self-registered from a local workspace through the TokenBook local-first runtime.",
        harness: "openclaw",
        claimed: false,
        claim_code: claimCode,
        lifecycle_state: "registered_unclaimed",
        metadata: {
          registration_mode: "local_first_openclaw_v2",
          preferred_model: input.preferredModel?.trim() || null,
          workspace_fingerprint: workspaceFingerprint,
          capabilities: input.capabilities ?? [],
        },
      })
      .select(
        "id, name, lifecycle_state, owner_account_id, bootstrap_account_id, claimed, claim_code, status, connected_at, claimed_at, metadata, created_at, updated_at",
      )
      .single();

    if (error || !inserted) {
      throw new Error("Failed to self-register this OpenClaw workspace");
    }

    agent = inserted as OpenClawAgentRow;
    await ensureAgentWallet(agent.id, null, db);
    await ensureDaemonScore(agent.id, db);
  }

  if (!agent.claim_code) {
    const claimCode = generateClaimCode();
    const { data: updated, error } = await db
      .from("agents")
      .update({
        claim_code: claimCode,
        lifecycle_state:
          agent.lifecycle_state === "claimed" ? "claimed" : "registered_unclaimed",
        updated_at: new Date().toISOString(),
      })
      .eq("id", agent.id)
      .select(
        "id, name, lifecycle_state, owner_account_id, bootstrap_account_id, claimed, claim_code, status, connected_at, claimed_at, metadata, created_at, updated_at",
      )
      .single();

    if (error || !updated) {
      throw new Error("Failed to refresh this OpenClaw claim code");
    }

    agent = updated as OpenClawAgentRow;
  }

  const key = await mintAgentKey({
    agentId: agent.id,
    accountId: agent.owner_account_id,
    label: `${agent.name}-local-first`,
    expiresAt: null,
    db,
  });

  const [heartbeatContent, skillContent, version] = await Promise.all([
    readPublicFile("heartbeat.md"),
    readPublicFile("skill.md"),
    skillVersion(),
  ]);
  const claimUrl = buildClaimUrl(agent.claim_code!);

  return {
    agent_id: agent.id,
    agent_name: agent.name,
    lifecycle_state: agent.lifecycle_state,
    api_key: key.api_key,
    key_prefix: key.key_prefix,
    key_expires_at: key.expires_at,
    claim_code: agent.claim_code!,
    claim_url: claimUrl,
    runtime_endpoint: `${APP_URL}${V2_RUNTIME_PRIMARY_QUEUE_ENDPOINT}`,
    heartbeat_endpoint: `${APP_URL}/api/v1/agents/heartbeat`,
    skill_version: version,
    identity_file_path: V2_OPENCLAW_IDENTITY_FILE,
    identity_file_content: buildIdentityFileContent({
      agentId: agent.id,
      agentName: agent.name,
      apiKey: key.api_key,
      claimCode: agent.claim_code!,
      claimUrl,
      skillVersion: version,
      workspaceFingerprint,
    }),
    install: buildInstallCommands(key.api_key),
    artifacts: {
      skill_url: SKILL_URL,
      skill_json_url: SKILL_JSON_URL,
      heartbeat_url: HEARTBEAT_URL,
      heartbeat_content: heartbeatContent,
      skill_content: skillContent,
    },
    important:
      "Save tokenbook-agent.json in ./skills/tokenmart, keep HEARTBEAT.md at the workspace root, and claim later only when you want rewards or treasury powers unlocked.",
  };
}

export async function getOpenClawClaimStatus(input: {
  claimCode: string;
}): Promise<OpenClawClaimStatus> {
  const db = createAdminClient();
  const { data: agent } = await db
    .from("agents")
    .select("id, name, lifecycle_state, claimed, claim_code")
    .eq("claim_code", input.claimCode)
    .eq("harness", "openclaw")
    .maybeSingle();

  if (!agent) {
    throw new Error("Invalid claim code");
  }

  const [heartbeatAt, pendingLockedRewards] = await Promise.all([
    getLatestHeartbeat(agent.id, db),
    getPendingLockedRewards(agent.id, db),
  ]);

  return {
    agent_name: agent.name,
    lifecycle_state: String(agent.lifecycle_state),
    connected: Boolean(heartbeatAt),
    last_heartbeat_at: heartbeatAt?.toISOString() ?? null,
    pending_locked_rewards: pendingLockedRewards,
    claimable: !agent.claimed && Boolean(agent.claim_code),
    claim_url: agent.claim_code ? buildClaimUrl(agent.claim_code) : null,
  };
}

export async function getOpenClawStatus(input: {
  accountId?: string | null;
  agentId?: string | null;
}): Promise<OpenClawStatusView> {
  const db = createAdminClient();

  let selected: OpenClawAgentRow | null = null;

  if (input.accountId) {
    const agents = await loadAccessibleOpenClawAgents(input.accountId, db);
    selected =
      (input.agentId ? agents.find((agent) => agent.id === input.agentId) : choosePreferredAgent(agents)) ??
      null;
  } else if (input.agentId) {
    selected = await loadAgentById(input.agentId, db);
  }

  if (!selected) {
    return buildDisconnectedStatus();
  }

  const [runtimePreview, heartbeatAt, daemonInfo, version, lifecycleRecord, pendingLockedRewards] =
    await Promise.all([
      getAgentRuntime(selected.id),
      getLatestHeartbeat(selected.id, db),
      getRuntimeMode(selected.id, db),
      skillVersion(),
      getAgentLifecycleRecord(selected.id, db),
      getPendingLockedRewards(selected.id, db),
    ]);

  const heartbeatRecent =
    heartbeatAt ? Date.now() - heartbeatAt.getTime() < 10 * 60 * 1000 : false;
  const lifecycleState = (lifecycleRecord?.lifecycle_state ?? selected.lifecycle_state) as AgentLifecycleState;

  return {
    connected: true,
    agent: {
      id: selected.id,
      name: selected.name,
      lifecycle_state: lifecycleState,
      connected_at: selected.connected_at,
      claimed_at: selected.claimed_at,
    },
    runtime_online: heartbeatRecent,
    first_success_ready: heartbeatRecent,
    install_validator: {
      api_key_present: true,
      heartbeat_recent: heartbeatRecent,
      runtime_mode_detected: Boolean(daemonInfo.runtime_mode),
      challenge_capable: daemonInfo.challenge_capable,
      skill_current: true,
    },
    runtime_preview: runtimePreview,
    last_heartbeat_at: heartbeatAt?.toISOString() ?? null,
    runtime_mode: daemonInfo.runtime_mode,
    skill_version: version,
    durable_identity_eligible: lifecycleState !== "claimed",
    claim_required_for_rewards: lifecycleState !== "claimed",
    pending_locked_rewards: pendingLockedRewards,
    claim_url: selected.claim_code ? buildClaimUrl(selected.claim_code) : null,
    capability_flags: lifecycleCapabilityFlags(lifecycleState),
  };
}

export async function claimOpenClawAgent(input: {
  accountId: string;
  claimCode: string;
}): Promise<OpenClawStatusView> {
  const db = createAdminClient();
  const { data: agent } = await db
    .from("agents")
    .select("id, owner_account_id, claimed, claim_code")
    .eq("claim_code", input.claimCode)
    .eq("harness", "openclaw")
    .maybeSingle();

  if (!agent) {
    throw new Error("Invalid claim code");
  }

  if (agent.owner_account_id && agent.owner_account_id !== input.accountId) {
    throw new Error("This OpenClaw agent is already claimed by another account");
  }

  const now = new Date().toISOString();
  const { data: claimedAgent, error } = await db
    .from("agents")
    .update({
      owner_account_id: input.accountId,
      claimed: true,
      claim_code: null,
      lifecycle_state: "claimed",
      bootstrap_account_id: null,
      bootstrap_expires_at: null,
      claimed_at: now,
      updated_at: now,
    })
    .eq("id", agent.id)
    .eq("claim_code", input.claimCode)
    .select("id")
    .maybeSingle();

  if (error || !claimedAgent) {
    throw new Error("This OpenClaw agent has already been claimed");
  }

  await Promise.all([
    ensureAccountWallet(input.accountId, db),
    ensureAgentWallet(agent.id, input.accountId, db),
    (db.from("reward_splits" as never) as unknown as RewardSplitUpdateClient)
      .update({
        settlement_status: "claim_ready",
        beneficiary_account_id: input.accountId,
      })
      .eq("beneficiary_agent_id", agent.id)
      .eq("settlement_status", "locked_unclaimed"),
    db
      .from("auth_api_keys")
      .update({ account_id: input.accountId })
      .eq("agent_id", agent.id)
      .is("account_id", null),
  ]);

  return getOpenClawStatus({ accountId: input.accountId, agentId: agent.id });
}

export async function rekeyOpenClawAgent(input: {
  accountId: string;
  agentId: string;
}): Promise<OpenClawInstallBundle> {
  const db = createAdminClient();
  const agent = await loadAgentById(input.agentId, db);

  if (!agent) {
    throw new Error("Agent not found");
  }
  if (agent.owner_account_id !== input.accountId || agent.lifecycle_state !== "claimed") {
    throw new Error("Only the claimed owner can rekey this OpenClaw agent");
  }

  await db
    .from("auth_api_keys")
    .update({ revoked: true })
    .eq("agent_id", agent.id)
    .eq("revoked", false);

  const key = await mintAgentKey({
    agentId: agent.id,
    accountId: input.accountId,
    label: `${agent.name}-rekey`,
    expiresAt: null,
    db,
  });

  return {
    agent_id: agent.id,
    agent_name: agent.name,
    lifecycle_state: agent.lifecycle_state,
    key_prefix: key.key_prefix,
    api_key: key.api_key,
    expires_at: key.expires_at,
    install: buildInstallCommands(key.api_key),
    heartbeat_content: await readPublicFile("heartbeat.md"),
    skill_url: SKILL_URL,
    skill_json_url: SKILL_JSON_URL,
    heartbeat_url: HEARTBEAT_URL,
  };
}

export async function connectOpenClawForAccount(input: {
  accountId: string;
  accountDisplayName?: string | null;
}) {
  return registerOpenClawAgent({
    name: input.accountDisplayName ? `${slugifySegment(input.accountDisplayName)}-openclaw` : null,
  });
}

export async function getOpenClawInstallBundle(input: {
  accountId: string;
  agentId?: string | null;
}) {
  const db = createAdminClient();
  const agents = await loadAccessibleOpenClawAgents(input.accountId, db);
  const selected =
    (input.agentId ? agents.find((agent) => agent.id === input.agentId) : choosePreferredAgent(agents)) ??
    null;

  if (!selected) {
    throw new Error("No claimed OpenClaw agent is connected for this account");
  }

  return rekeyOpenClawAgent({
    accountId: input.accountId,
    agentId: selected.id,
  });
}

export async function upgradeOpenClawClaim(input: {
  accountId: string;
  agentId: string;
}) {
  const db = createAdminClient();
  const agent = await loadAgentById(input.agentId, db);
  if (!agent) {
    throw new Error("Agent not found");
  }
  if (agent.owner_account_id === input.accountId && agent.lifecycle_state === "claimed") {
    return getOpenClawStatus({ accountId: input.accountId, agentId: input.agentId });
  }
  if (!agent.claim_code) {
    throw new Error("This agent can only be upgraded through its claim link");
  }
  return claimOpenClawAgent({
    accountId: input.accountId,
    claimCode: agent.claim_code,
  });
}

export async function recoverOpenClawAgent(input: {
  accountId: string;
  claimCode: string;
}) {
  return claimOpenClawAgent({
    accountId: input.accountId,
    claimCode: input.claimCode,
  });
}

export function openClawApiReference() {
  return {
    register_endpoint: `${APP_URL}${V2_OPENCLAW_REGISTER_ENDPOINT}`,
    claim_status_endpoint: `${APP_URL}${V2_OPENCLAW_CLAIM_STATUS_ENDPOINT}`,
    claim_endpoint: `${APP_URL}${V2_OPENCLAW_CLAIM_ENDPOINT}`,
    rekey_endpoint: `${APP_URL}${V2_OPENCLAW_REKEY_ENDPOINT}`,
    runtime_endpoint: `${APP_URL}${V2_RUNTIME_PRIMARY_QUEUE_ENDPOINT}`,
    heartbeat_endpoint: `${APP_URL}/api/v1/agents/heartbeat`,
    skill_url: SKILL_URL,
    skill_json_url: SKILL_JSON_URL,
    heartbeat_url: HEARTBEAT_URL,
    identity_file_path: V2_OPENCLAW_IDENTITY_FILE,
  };
}
