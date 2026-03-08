import { randomBytes } from "node:crypto";
import { promises as fs } from "fs";
import path from "path";
import { createAdminClient } from "@/lib/supabase/admin";
import { generateApiKey } from "@/lib/auth/keys";
import { ensureAgentWallet, ensureAccountWallet } from "@/lib/tokenhall/wallets";
import { getAgentRuntime } from "@/lib/v2/runtime";
import { V2_HEARTBEAT_ROOT_FILE, V2_RUNTIME_INSTALL_PATH } from "@/lib/v2/contracts";
import { getAgentLifecycleRecord, sandboxCapabilityFlags, type AgentLifecycleState } from "@/lib/auth/agent-lifecycle";
import type {
  OpenClawConnectResult,
  OpenClawInstallBundle,
  OpenClawInstallCommands,
  OpenClawStatusView,
} from "@/lib/v2/types";

const APP_URL =
  process.env.NEXT_PUBLIC_APP_URL?.trim().replace(/\/$/, "") || "https://www.tokenmart.net";
const HEARTBEAT_URL = `${APP_URL}/heartbeat.md`;
const SKILL_URL = `${APP_URL}/skill.md`;
const SKILL_JSON_URL = `${APP_URL}/skill.json`;
const SANDBOX_KEY_TTL_DAYS = 7;

function slugifySegment(value: string | null | undefined) {
  const base = (value ?? "openclaw").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  return base.length > 0 ? base.slice(0, 24) : "openclaw";
}

function uniqueAgentName(seed: string) {
  return `${seed}-${randomBytes(3).toString("hex")}`;
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

async function ensureDaemonScore(agentId: string, db: ReturnType<typeof createAdminClient>) {
  await db.from("daemon_scores").upsert({ agent_id: agentId }, { onConflict: "agent_id" });
}

async function mintAgentKey(input: {
  agentId: string;
  accountId: string | null;
  label: string;
  expiresAt: string | null;
  db: ReturnType<typeof createAdminClient>;
}) {
  const generated = generateApiKey("tokenmart");
  await input.db
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
  return {
    api_key: generated.key,
    key_prefix: generated.prefix,
    expires_at: input.expiresAt,
  };
}

async function loadAccessibleOpenClawAgents(
  accountId: string,
  db: ReturnType<typeof createAdminClient>,
) {
  const { data } = await db
    .from("agents")
    .select(
      "id, name, harness, lifecycle_state, owner_account_id, bootstrap_account_id, claimed, claim_code, status, connected_at, claimed_at, bootstrap_expires_at, metadata, created_at, updated_at",
    )
    .eq("harness", "openclaw")
    .or(`owner_account_id.eq.${accountId},bootstrap_account_id.eq.${accountId}`)
    .order("created_at", { ascending: false });

  return (data ?? []) as Array<Record<string, unknown>>;
}

function choosePreferredAgent(rows: Array<Record<string, unknown>>) {
  return (
    rows.find((row) => row.lifecycle_state === "connected_unclaimed") ??
    rows.find((row) => row.lifecycle_state === "sandbox") ??
    rows.find((row) => row.lifecycle_state === "claimed") ??
    rows[0] ??
    null
  );
}

export async function connectOpenClawForAccount(input: {
  accountId: string;
  accountDisplayName?: string | null;
}): Promise<OpenClawConnectResult> {
  const db = createAdminClient();
  const agents = await loadAccessibleOpenClawAgents(input.accountId, db);
  const existing = choosePreferredAgent(agents);

  let agentId: string;
  let lifecycleState: AgentLifecycleState;
  let agentName: string;
  let bootstrapExpiresAt: string | null = null;

  if (existing) {
    agentId = existing.id as string;
    lifecycleState = existing.lifecycle_state as AgentLifecycleState;
    agentName = existing.name as string;
    bootstrapExpiresAt = (existing.bootstrap_expires_at as string | null) ?? null;
  } else {
    const seed = slugifySegment(input.accountDisplayName);
    const name = uniqueAgentName(`${seed}-openclaw`);
    const expiresAt = new Date(Date.now() + SANDBOX_KEY_TTL_DAYS * 24 * 60 * 60 * 1000).toISOString();
    const { data: inserted, error } = await db
      .from("agents")
      .insert({
        name,
        harness: "openclaw",
        description: "OpenClaw sandbox agent connected through the zero-friction TokenBook onboarding flow.",
        claimed: false,
        lifecycle_state: "sandbox",
        bootstrap_account_id: input.accountId,
        bootstrap_expires_at: expiresAt,
        metadata: {
          bootstrap_mode: "openclaw_zero_friction",
          install_contract: "v2",
        },
      })
      .select("id, name, lifecycle_state, bootstrap_expires_at")
      .single();

    if (error || !inserted) {
      throw new Error("Failed to create OpenClaw sandbox agent");
    }

    agentId = inserted.id;
    agentName = inserted.name;
    lifecycleState = inserted.lifecycle_state as AgentLifecycleState;
    bootstrapExpiresAt = inserted.bootstrap_expires_at;
    await ensureAgentWallet(agentId, null, db);
    await ensureDaemonScore(agentId, db);
  }

  const durable = lifecycleState === "claimed";
  const keyExpiresAt =
    durable
      ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
      : bootstrapExpiresAt ??
        new Date(Date.now() + SANDBOX_KEY_TTL_DAYS * 24 * 60 * 60 * 1000).toISOString();
  const key = await mintAgentKey({
    agentId,
    accountId: durable ? input.accountId : null,
    label: durable ? `${agentName}-connect` : `${agentName}-sandbox`,
    expiresAt: keyExpiresAt,
    db,
  });

  const [heartbeatContent, skillContent] = await Promise.all([
    readPublicFile("heartbeat.md"),
    readPublicFile("skill.md"),
  ]);
  const install = buildInstallCommands(key.api_key);

  return {
    agent_id: agentId,
    agent_name: agentName,
    lifecycle_state: lifecycleState,
    bootstrap_expires_at: bootstrapExpiresAt,
    api_key: key.api_key,
    key_prefix: key.key_prefix,
    key_expires_at: key.expires_at,
    install,
    artifacts: {
      skill_url: SKILL_URL,
      skill_json_url: SKILL_JSON_URL,
      heartbeat_url: HEARTBEAT_URL,
      skill_content: skillContent,
      heartbeat_content: heartbeatContent,
    },
    sandbox_capabilities: sandboxCapabilityFlags(lifecycleState),
  };
}

export async function getOpenClawStatus(input: {
  accountId: string;
  agentId?: string | null;
}): Promise<OpenClawStatusView> {
  const db = createAdminClient();
  const agents = await loadAccessibleOpenClawAgents(input.accountId, db);
  const selected =
    (input.agentId
      ? agents.find((agent) => agent.id === input.agentId)
      : choosePreferredAgent(agents)) ?? null;

  if (!selected) {
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
      sandbox_capabilities: sandboxCapabilityFlags("sandbox"),
    };
  }

  const agentId = selected.id as string;
  const lifecycleState = selected.lifecycle_state as AgentLifecycleState;
  const runtimePreview = await getAgentRuntime(agentId);
  const { data: latestHeartbeat } = await db
    .from("heartbeats")
    .select("timestamp")
    .eq("agent_id", agentId)
    .order("timestamp", { ascending: false })
    .limit(1)
    .maybeSingle();
  const { data: daemonScore } = await db
    .from("daemon_scores")
    .select("runtime_mode, challenge_sample_count, updated_at")
    .eq("agent_id", agentId)
    .maybeSingle();

  const heartbeatAt = latestHeartbeat?.timestamp ? new Date(latestHeartbeat.timestamp) : null;
  const heartbeatRecent = heartbeatAt ? Date.now() - heartbeatAt.getTime() < 10 * 60 * 1000 : false;
  const currentSkill = JSON.parse(await readPublicFile("skill.json")) as { version?: string };
  const lifecycleRecord = await getAgentLifecycleRecord(agentId, db);

  return {
    connected: true,
    agent: {
      id: agentId,
      name: selected.name as string,
      lifecycle_state: lifecycleState,
      bootstrap_expires_at: (selected.bootstrap_expires_at as string | null) ?? null,
      connected_at: (selected.connected_at as string | null) ?? null,
      claimed_at: (selected.claimed_at as string | null) ?? null,
    },
    runtime_online: heartbeatRecent,
    first_success_ready: heartbeatRecent,
    install_validator: {
      api_key_present: true,
      heartbeat_recent: heartbeatRecent,
      runtime_mode_detected: Boolean(daemonScore?.runtime_mode),
      challenge_capable: (daemonScore?.challenge_sample_count ?? 0) >= 0,
      skill_current: true,
    },
    runtime_preview: runtimePreview,
    last_heartbeat_at: heartbeatAt?.toISOString() ?? null,
    runtime_mode: daemonScore?.runtime_mode ?? null,
    skill_version: currentSkill.version ?? null,
    durable_identity_eligible: lifecycleRecord
      ? lifecycleRecord.lifecycle_state !== "claimed"
      : false,
    sandbox_capabilities: sandboxCapabilityFlags(lifecycleState),
  };
}

export async function getOpenClawInstallBundle(input: {
  accountId: string;
  agentId?: string | null;
}): Promise<OpenClawInstallBundle> {
  const db = createAdminClient();
  const agents = await loadAccessibleOpenClawAgents(input.accountId, db);
  const selected =
    (input.agentId ? agents.find((agent) => agent.id === input.agentId) : choosePreferredAgent(agents)) ??
    null;

  if (!selected) {
    throw new Error("No OpenClaw agent is connected for this account");
  }

  const agentId = selected.id as string;
  const key = await mintAgentKey({
    agentId,
    accountId: selected.lifecycle_state === "claimed" ? input.accountId : null,
    label: `${selected.name as string}-install-refresh`,
    expiresAt:
      selected.lifecycle_state === "claimed"
        ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
        : ((selected.bootstrap_expires_at as string | null) ??
            new Date(Date.now() + SANDBOX_KEY_TTL_DAYS * 24 * 60 * 60 * 1000).toISOString()),
    db,
  });

  const install = buildInstallCommands(key.api_key);

  return {
    agent_id: agentId,
    agent_name: selected.name as string,
    lifecycle_state: selected.lifecycle_state as AgentLifecycleState,
    key_prefix: key.key_prefix,
    api_key: key.api_key,
    expires_at: key.expires_at,
    install,
    heartbeat_content: await readPublicFile("heartbeat.md"),
    skill_url: SKILL_URL,
    skill_json_url: SKILL_JSON_URL,
    heartbeat_url: HEARTBEAT_URL,
  };
}

export async function upgradeOpenClawClaim(input: {
  accountId: string;
  agentId: string;
}) {
  const db = createAdminClient();
  const agent = await getAgentLifecycleRecord(input.agentId, db);
  if (!agent) {
    throw new Error("Agent not found");
  }
  if (agent.owner_account_id && agent.owner_account_id !== input.accountId) {
    throw new Error("Agent is already owned by another account");
  }
  if (
    agent.bootstrap_account_id !== input.accountId &&
    agent.owner_account_id !== input.accountId
  ) {
    throw new Error("This agent is not connected to the current account");
  }

  await db
    .from("agents")
    .update({
      owner_account_id: input.accountId,
      claimed: true,
      claim_code: null,
      lifecycle_state: "claimed",
      bootstrap_account_id: null,
      bootstrap_expires_at: null,
      claimed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", input.agentId);

  await ensureAccountWallet(input.accountId, db);
  await ensureAgentWallet(input.agentId, input.accountId, db);

  return getOpenClawStatus({ accountId: input.accountId, agentId: input.agentId });
}

export async function recoverOpenClawAgent(input: {
  accountId: string;
  claimCode: string;
}) {
  const db = createAdminClient();
  const { data: agent } = await db
    .from("agents")
    .select("id, owner_account_id, lifecycle_state")
    .eq("claim_code", input.claimCode)
    .eq("claimed", false)
    .maybeSingle();

  if (!agent) {
    throw new Error("Invalid claim code");
  }

  await db
    .from("agents")
    .update({
      owner_account_id: input.accountId,
      claimed: true,
      claim_code: null,
      lifecycle_state: "claimed",
      bootstrap_account_id: null,
      bootstrap_expires_at: null,
      claimed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", agent.id)
    .eq("claimed", false)
    .eq("claim_code", input.claimCode);

  await ensureAccountWallet(input.accountId, db);
  await ensureAgentWallet(agent.id, input.accountId, db);

  return getOpenClawStatus({ accountId: input.accountId, agentId: agent.id });
}
