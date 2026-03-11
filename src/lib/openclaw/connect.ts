import { createHash, randomBytes } from "node:crypto";
import { promises as fs, readFileSync } from "fs";
import path from "path";
import { createAdminClient } from "@/lib/supabase/admin";
import { generateApiKey, generateClaimCode, hashKey } from "@/lib/auth/keys";
import { ensureAccountWallet, ensureAgentWallet } from "@/lib/tokenhall/wallets";
import { getAgentLifecycleRecord, lifecycleCapabilityFlags, type AgentLifecycleState } from "@/lib/auth/agent-lifecycle";
import { getAgentRuntime } from "@/lib/v2/runtime";
import {
  V2_OPENCLAW_INJECTOR_PATH,
  V2_OPENCLAW_CLAIM_ENDPOINT,
  V2_OPENCLAW_CLAIM_STATUS_ENDPOINT,
  V2_OPENCLAW_IDENTITY_FILE,
  V2_OPENCLAW_REGISTER_ENDPOINT,
  V2_OPENCLAW_REKEY_ENDPOINT,
  V2_RUNTIME_PRIMARY_QUEUE_ENDPOINT,
  V3_OPENCLAW_BRIDGE_ATTACH_ENDPOINT,
  V3_OPENCLAW_BRIDGE_COMMAND,
  V3_OPENCLAW_BRIDGE_MANIFEST_ENDPOINT,
  V3_OPENCLAW_BRIDGE_MODE,
  V3_OPENCLAW_BRIDGE_SCRIPT_PATH,
  V3_OPENCLAW_BRIDGE_SELF_UPDATE_ENDPOINT,
  V3_OPENCLAW_PRIVATE_CREDENTIALS_RELATIVE_DIR,
} from "@/lib/v2/contracts";
import type {
  OpenClawBridgeAttachResult,
  OpenClawBridgeManifest,
  OpenClawBridgeStatusView,
  OpenClawClaimStatus,
  OpenClawInstallBundle,
  OpenClawInstallCommands,
  OpenClawRegisterResult,
  OpenClawStatusView,
} from "@/lib/v2/types";
import type { Json } from "@/types/database";

const APP_URL =
  process.env.NEXT_PUBLIC_APP_URL?.trim().replace(/\/$/, "") || "https://www.tokenmart.net";
const HEARTBEAT_URL = `${APP_URL}/heartbeat.md`;
const SKILL_URL = `${APP_URL}/skill.md`;
const SKILL_JSON_URL = `${APP_URL}/skill.json`;
const OPENCLAW_BRIDGE_VERSION = "3.0.0";
const OPENCLAW_BRIDGE_MINIMUM_VERSION = "2026.3.2";

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

interface OpenClawBridgeInstanceRow {
  id: string;
  agent_id: string;
  workspace_fingerprint: string;
  bridge_mode: string;
  bridge_version: string;
  profile_name: string;
  workspace_path: string;
  openclaw_home: string;
  openclaw_version: string | null;
  platform: string;
  cron_health: string;
  hook_health: string;
  runtime_online: boolean;
  last_attach_at: string;
  last_pulse_at: string | null;
  last_self_check_at: string | null;
  last_manifest_version: string | null;
  last_manifest_checksum: string | null;
  local_asset_path: string | null;
  local_asset_checksum: string | null;
  update_available: boolean;
  update_required: boolean;
  last_update_at: string | null;
  last_update_error: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
}

interface AttachOpenClawBridgeInput {
  name?: string | null;
  description?: string | null;
  preferredModel?: string | null;
  workspacePath: string;
  workspaceFingerprint: string;
  profileName?: string | null;
  openclawHome?: string | null;
  openclawVersion?: string | null;
  platform?: string | null;
  bridgeVersion?: string | null;
  bridgeMode?: string | null;
  cronHealth?: string | null;
  hookHealth?: string | null;
  metadata?: Record<string, unknown> | null;
  existingAgentId?: string | null;
  existingApiKey?: string | null;
  existingClaimCode?: string | null;
  existingClaimUrl?: string | null;
}

interface RecordBridgeSelfUpdateInput {
  agentId: string;
  workspaceFingerprint: string;
  profileName?: string | null;
  bridgeVersion?: string | null;
  runtimeOnline: boolean;
  workspacePath?: string | null;
  openclawHome?: string | null;
  openclawVersion?: string | null;
  platform?: string | null;
  cronHealth?: string | null;
  hookHealth?: string | null;
  metadata?: Record<string, unknown>;
  lastManifestVersion?: string | null;
  lastManifestChecksum?: string | null;
  localAssetPath?: string | null;
  localAssetChecksum?: string | null;
  updateAvailable?: boolean;
  updateRequired?: boolean;
  lastUpdateAt?: string | null;
  lastUpdateError?: string | null;
  lastUpdateOutcome?: string | null;
}

interface RecordBridgePulseInput {
  agentId: string;
  workspaceFingerprint: string;
  profileName?: string | null;
  bridgeVersion?: string | null;
  workspacePath?: string | null;
  openclawHome?: string | null;
  openclawVersion?: string | null;
  platform?: string | null;
  cronHealth?: string | null;
  hookHealth?: string | null;
  localAssetChecksum?: string | null;
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

function isMissingOpenClawBridgeTableError(error: { code?: string | null; message?: string | null } | null | undefined) {
  const message = error?.message ?? "";
  return error?.code === "PGRST205" || message.includes("openclaw_bridge_instances");
}

function assertBridgeSchemaAvailable(error: { code?: string | null; message?: string | null } | null | undefined) {
  if (!isMissingOpenClawBridgeTableError(error)) return;
  throw new Error(
    "OpenClaw bridge schema is unavailable. Apply the latest Supabase migrations before using bridge attach, status, or self-check routes.",
  );
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
  return `${APP_URL}/connect/runtime?claim_code=${encodeURIComponent(claimCode)}`;
}

function normalizeProfileName(profileName: string | null | undefined) {
  const trimmed = profileName?.trim();
  return trimmed && trimmed.length > 0 ? trimmed : "default";
}

function buildPrivateCredentialsPath(profileName: string, openclawHome?: string | null) {
  const normalized = normalizeProfileName(profileName);
  const home = openclawHome?.trim() || "~/.openclaw";
  return `${home}/${V3_OPENCLAW_PRIVATE_CREDENTIALS_RELATIVE_DIR}/${normalized}.json`;
}

function buildBridgeEntrypoint(openclawHome: string | null | undefined) {
  const home = openclawHome?.trim() || "~/.openclaw";
  return `${home}/bin/${V3_OPENCLAW_BRIDGE_COMMAND}`;
}

function bridgeTemplates(bridgeEntrypoint: string) {
  return {
    boot_md: [
      "# TokenBook Bridge BOOT",
      "",
      `1. Run \`${bridgeEntrypoint} attach\`.`,
      `2. Run \`${bridgeEntrypoint} status\` and confirm the bridge is attached.`,
      "3. If the bridge reports `rekey_required`, surface that to the human and stop mutating TokenBook state.",
      "4. When attach is healthy, continue with the normal mission runtime.",
      "",
      "Do not replace this file with a large remote onboarding contract.",
    ].join("\n"),
    heartbeat_md: [
      "---",
      "name: tokenbook-bridge-heartbeat",
      `version: ${OPENCLAW_BRIDGE_VERSION}`,
      "description: Thin workspace heartbeat for the local TokenBook bridge.",
      "---",
      "",
      "# TokenBook Bridge HEARTBEAT",
      "",
      `Run \`${bridgeEntrypoint} pulse\`.`,
      "",
      "If the bridge prints `HEARTBEAT_OK`, return exactly that token.",
      "If the bridge prints a runtime brief or a rekey/claim alert, follow it instead of emitting `HEARTBEAT_OK`.",
    ].join("\n"),
    local_skill_shim: [
      "---",
      "name: tokenbook-bridge-local",
      `version: ${OPENCLAW_BRIDGE_VERSION}`,
      "description: Minimal local shim for the injected TokenBook bridge.",
      "---",
      "",
      "# TokenBook Bridge",
      "",
      `The runtime behavior now lives in \`${bridgeEntrypoint}\`.`,
      "",
      "Use it to attach, pulse, reconcile, inspect status, and check claim/rekey state locally.",
      "The public skill and heartbeat exports remain compatibility references only.",
    ].join("\n"),
  };
}

function buildBridgeStatus(instance: OpenClawBridgeInstanceRow | null): OpenClawBridgeStatusView | null {
  if (!instance) return null;
  const metadata = instance.metadata ?? {};
  const currentChecksum =
    instance.local_asset_checksum
    ?? (typeof metadata.current_checksum === "string" ? metadata.current_checksum : null);
  const localAssetPath =
    instance.local_asset_path
    ?? (typeof metadata.local_asset_path === "string" ? metadata.local_asset_path : null);
  const lastUpdateAt =
    instance.last_update_at
    ?? (typeof metadata.last_update_at === "string" ? metadata.last_update_at : null);
  const lastUpdateError =
    instance.last_update_error
    ?? (typeof metadata.last_update_error === "string" ? metadata.last_update_error : null);
  const lastUpdateOutcome =
    typeof metadata.last_update_outcome === "string" ? metadata.last_update_outcome : null;
  const runtimeFetchHealth =
    metadata.runtime_fetch_health === "healthy" || metadata.runtime_fetch_health === "degraded"
      ? metadata.runtime_fetch_health
      : "unknown";
  const degradedReason =
    typeof metadata.degraded_reason === "string" ? metadata.degraded_reason : null;
  return {
    bridge_mode: instance.bridge_mode,
    bridge_version: instance.bridge_version,
    profile_name: instance.profile_name,
    workspace_path: instance.workspace_path,
    openclaw_home: instance.openclaw_home,
    openclaw_version: instance.openclaw_version,
    last_attach_at: instance.last_attach_at,
    last_pulse_at: instance.last_pulse_at,
    last_self_check_at: instance.last_self_check_at,
    cron_health: instance.cron_health,
    hook_health: instance.hook_health,
    runtime_online: instance.runtime_online,
    runtime_fetch_health: runtimeFetchHealth,
    rekey_required: Boolean(metadata.rekey_required),
    update_available: instance.update_available || metadata.update_available === true,
    update_required: instance.update_required || metadata.update_required === true,
    last_update_at: lastUpdateAt,
    last_update_error: lastUpdateError,
    last_update_outcome: lastUpdateOutcome,
    current_checksum: currentChecksum,
    local_asset_path: localAssetPath,
    last_manifest_version: instance.last_manifest_version,
    last_manifest_checksum: instance.last_manifest_checksum,
    degraded_reason: degradedReason,
  };
}

function buildBridgeDiagnostics(bridge: OpenClawBridgeStatusView | null, runtimeReachable: boolean) {
  return {
    bridge_installed: Boolean(bridge),
    credentials_present: Boolean(bridge),
    hooks_registered: Boolean(bridge?.hook_health && bridge.hook_health !== "missing"),
    cron_registered: Boolean(bridge?.cron_health && bridge.cron_health !== "missing"),
    runtime_reachable: runtimeReachable,
    runtime_fetch_health: bridge?.runtime_fetch_health ?? "unknown",
    pulse_recent: false,
    self_check_recent: false,
    challenge_fresh: false,
    manifest_drift: Boolean(
      bridge?.bridge_version &&
        bridge?.last_manifest_version &&
        bridge.bridge_version !== bridge.last_manifest_version,
    ),
    degraded_reason: bridge?.degraded_reason ?? null,
    last_error: bridge?.last_update_error
      ?? bridge?.degraded_reason
      ?? (bridge?.rekey_required
        ? "The local TokenBook bridge needs a claimed-owner rekey before runtime work can resume."
        : null),
  };
}

function buildInstallCommands(apiKey: string): OpenClawInstallCommands {
  const injectorCommand = `curl -fsSL ${APP_URL}${V2_OPENCLAW_INJECTOR_PATH} | bash`;
  return {
    env: `export TOKENMART_API_KEY="${apiKey}"`,
    injector: injectorCommand,
    workspace_install: [
      "# Canonical human path",
      injectorCommand,
      "",
      "# Compatibility exports still exist, but they are recovery references now.",
      "# Read /docs/runtime/injector if you need the full backend and local-file contract.",
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

function readBridgeAssetChecksum() {
  const bridgeAsset = readFileSync(
    path.join(process.cwd(), "public", "openclaw", "bridge", "tokenbook-bridge.sh"),
    "utf8",
  );
  return createHash("sha256").update(bridgeAsset).digest("hex");
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

async function loadBridgeInstanceByAgentId(
  agentId: string,
  options: {
    profileName?: string | null;
    workspaceFingerprint?: string | null;
  } = {},
  db: AdminClient,
): Promise<OpenClawBridgeInstanceRow | null> {
  let query = db
    .from("openclaw_bridge_instances")
    .select(
      "id, agent_id, workspace_fingerprint, bridge_mode, bridge_version, profile_name, workspace_path, openclaw_home, openclaw_version, platform, cron_health, hook_health, runtime_online, last_attach_at, last_pulse_at, last_self_check_at, last_manifest_version, last_manifest_checksum, local_asset_path, local_asset_checksum, update_available, update_required, last_update_at, last_update_error, metadata, created_at, updated_at",
    )
    .eq("agent_id", agentId)
    .order("updated_at", { ascending: false });

  if (options.profileName?.trim()) {
    query = query.eq("profile_name", normalizeProfileName(options.profileName));
  }
  if (options.workspaceFingerprint?.trim()) {
    query = query.eq("workspace_fingerprint", options.workspaceFingerprint.trim());
  }

  const { data, error } = await query.limit(1).maybeSingle();
  assertBridgeSchemaAvailable(error);

  return (data as OpenClawBridgeInstanceRow | null) ?? null;
}

async function upsertBridgeInstance(
  input: {
    agentId: string;
    workspaceFingerprint: string;
    profileName: string;
    workspacePath: string;
    openclawHome: string;
    openclawVersion?: string | null;
    platform?: string | null;
    cronHealth?: string | null;
    hookHealth?: string | null;
    runtimeOnline?: boolean;
    bridgeVersion?: string;
    metadata?: Record<string, unknown>;
    lastManifestVersion?: string | null;
    lastManifestChecksum?: string | null;
    localAssetPath?: string | null;
    localAssetChecksum?: string | null;
    updateAvailable?: boolean;
    updateRequired?: boolean;
    lastUpdateAt?: string | null;
    lastUpdateError?: string | null;
    touchPulse?: boolean;
    touchSelfCheck?: boolean;
  },
  db: AdminClient,
) {
  const now = new Date().toISOString();
  const { data: existing, error: existingError } = await db
    .from("openclaw_bridge_instances")
    .select("last_pulse_at, last_self_check_at, metadata, update_available, update_required, last_update_at, last_update_error, last_manifest_version, last_manifest_checksum, local_asset_path, local_asset_checksum")
    .eq("agent_id", input.agentId)
    .eq("workspace_fingerprint", input.workspaceFingerprint)
    .eq("profile_name", normalizeProfileName(input.profileName))
    .maybeSingle();

  assertBridgeSchemaAvailable(existingError);
  const safeExisting = existing;

  const patch = {
    agent_id: input.agentId,
    workspace_fingerprint: input.workspaceFingerprint,
    bridge_mode: V3_OPENCLAW_BRIDGE_MODE,
    bridge_version: input.bridgeVersion ?? OPENCLAW_BRIDGE_VERSION,
    profile_name: normalizeProfileName(input.profileName),
    workspace_path: input.workspacePath,
    openclaw_home: input.openclawHome,
    openclaw_version: input.openclawVersion ?? null,
    platform: input.platform ?? "macos",
    cron_health: input.cronHealth ?? "unknown",
    hook_health: input.hookHealth ?? "unknown",
    runtime_online: input.runtimeOnline ?? false,
    last_attach_at: now,
    last_pulse_at: input.touchPulse ? now : safeExisting?.last_pulse_at ?? null,
    last_self_check_at: input.touchSelfCheck ? now : safeExisting?.last_self_check_at ?? null,
    last_manifest_version: input.lastManifestVersion ?? safeExisting?.last_manifest_version ?? null,
    last_manifest_checksum: input.lastManifestChecksum ?? safeExisting?.last_manifest_checksum ?? null,
    local_asset_path: input.localAssetPath ?? safeExisting?.local_asset_path ?? null,
    local_asset_checksum: input.localAssetChecksum ?? safeExisting?.local_asset_checksum ?? null,
    update_available: input.updateAvailable ?? safeExisting?.update_available ?? false,
    update_required: input.updateRequired ?? safeExisting?.update_required ?? false,
    last_update_at: input.lastUpdateAt ?? safeExisting?.last_update_at ?? null,
    last_update_error: input.lastUpdateError ?? safeExisting?.last_update_error ?? null,
    metadata: {
      ...(((safeExisting?.metadata as Record<string, unknown> | null) ?? {})),
      ...(input.metadata ?? {}),
    } as Json,
    updated_at: now,
  };

  const { data, error } = await db
    .from("openclaw_bridge_instances")
    .upsert(patch, {
      onConflict: "agent_id,workspace_fingerprint,profile_name",
      ignoreDuplicates: false,
    })
    .select(
      "id, agent_id, workspace_fingerprint, bridge_mode, bridge_version, profile_name, workspace_path, openclaw_home, openclaw_version, platform, cron_health, hook_health, runtime_online, last_attach_at, last_pulse_at, last_self_check_at, last_manifest_version, last_manifest_checksum, local_asset_path, local_asset_checksum, update_available, update_required, last_update_at, last_update_error, metadata, created_at, updated_at",
    )
    .single();

  if (error || !data) {
    assertBridgeSchemaAvailable(error);
    throw new Error(error?.message || "Failed to persist OpenClaw bridge instance state");
  }

  return data as OpenClawBridgeInstanceRow;
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

async function resolveAgentFromApiKey(
  apiKey: string,
  db: AdminClient,
): Promise<OpenClawAgentRow | null> {
  const keyHash = hashKey(apiKey);
  const { data: keyRow } = await db
    .from("auth_api_keys")
    .select("agent_id, revoked, expires_at")
    .eq("key_hash", keyHash)
    .maybeSingle();

  if (!keyRow?.agent_id || keyRow.revoked) return null;
  if (keyRow.expires_at && new Date(keyRow.expires_at) < new Date()) return null;

  return loadAgentById(keyRow.agent_id, db);
}

async function getRuntimeMode(agentId: string, db: AdminClient) {
  const { data } = await db
    .from("daemon_scores")
    .select("runtime_mode, challenge_sample_count")
    .eq("agent_id", agentId)
    .maybeSingle();

  return {
    runtime_mode: data?.runtime_mode ?? null,
    challenge_capable: Number(data?.challenge_sample_count ?? 0) > 0,
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
  const bridge = null;
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
    bridge_mode: null,
    bridge_version: null,
    profile_name: null,
    workspace_path: null,
    openclaw_home: null,
    openclaw_version: null,
    last_attach_at: null,
    last_pulse_at: null,
    last_self_check_at: null,
    cron_health: null,
    hook_health: null,
    rekey_required: false,
    runtime_fetch_health: "unknown",
    update_available: false,
    update_required: false,
    last_update_at: null,
    last_update_error: null,
    last_update_outcome: null,
    current_checksum: null,
    local_asset_path: null,
    last_manifest_version: null,
    last_manifest_checksum: null,
    degraded_reason: null,
    diagnostics: buildBridgeDiagnostics(bridge, false),
    bridge,
  };
}

export function getOpenClawBridgeManifest(): OpenClawBridgeManifest {
  return {
    bridge_mode: V3_OPENCLAW_BRIDGE_MODE,
    bridge_version: OPENCLAW_BRIDGE_VERSION,
    minimum_openclaw_version: OPENCLAW_BRIDGE_MINIMUM_VERSION,
    injector_url: `${APP_URL}${V2_OPENCLAW_INJECTOR_PATH}`,
    bridge_asset_url: `${APP_URL}${V3_OPENCLAW_BRIDGE_SCRIPT_PATH}`,
    bridge_asset_checksum: readBridgeAssetChecksum(),
    command_name: V3_OPENCLAW_BRIDGE_COMMAND,
    runtime_endpoint: `${APP_URL}${V2_RUNTIME_PRIMARY_QUEUE_ENDPOINT}`,
    heartbeat_endpoint: `${APP_URL}/api/v1/agents/heartbeat`,
    claim_status_endpoint: `${APP_URL}${V2_OPENCLAW_CLAIM_STATUS_ENDPOINT}`,
    rekey_endpoint: `${APP_URL}${V2_OPENCLAW_REKEY_ENDPOINT}`,
    status_endpoint: `${APP_URL}/api/v2/openclaw/status`,
    cron_spec: [
      {
        name: "tokenbook-reconcile",
        cadence: "every 30m",
        session: "main",
        mode: "systemEvent",
        command: `${V3_OPENCLAW_BRIDGE_COMMAND} reconcile`,
      },
      {
        name: "tokenbook-self-update-check",
        cadence: "every 6h",
        session: "main",
        mode: "systemEvent",
        command: `${V3_OPENCLAW_BRIDGE_COMMAND} self-update`,
      },
    ],
    hook_spec: [
      {
        name: "boot-md",
        required: true,
        install_mode: "internal_enable",
        purpose: "Run tokenbook-bridge attach and status at gateway startup.",
      },
    ],
    config_patch: {
      hooks_internal_enabled: true,
      pin_workspace_mode: "safe_auto",
      watch_skills: true,
      enable_boot_md: true,
    },
    templates: bridgeTemplates(buildBridgeEntrypoint("~/.openclaw")),
  };
}

export async function attachOpenClawBridge(
  input: AttachOpenClawBridgeInput,
): Promise<OpenClawBridgeAttachResult> {
  const db = createAdminClient();
  const profileName = normalizeProfileName(input.profileName);
  const workspacePath = input.workspacePath.trim();
  const workspaceFingerprint = input.workspaceFingerprint.trim();
  const openclawHome = input.openclawHome?.trim() || "~/.openclaw";

  let agent: OpenClawAgentRow | null = null;
  let reusedExistingIdentity = false;
  let rekeyRequired = false;
  const warnings: string[] = [];
  let apiKey: string | null = null;
  let keyPrefix: string | null = null;
  let claimUrl: string | null = null;
  let claimCode: string | null = null;

  if (input.existingApiKey?.trim()) {
    agent = await resolveAgentFromApiKey(input.existingApiKey.trim(), db);
    if (agent) {
      reusedExistingIdentity = true;
      apiKey = input.existingApiKey.trim();
      keyPrefix = apiKey.slice(0, "tokenmart_".length + 8);
      claimUrl = agent.claim_code ? buildClaimUrl(agent.claim_code) : null;
      claimCode = agent.claim_code;
    }
  }

  if (!agent && input.existingAgentId?.trim()) {
    const existingAgent = await loadAgentById(input.existingAgentId.trim(), db);
    if (existingAgent?.lifecycle_state === "claimed") {
      agent = existingAgent;
      rekeyRequired = true;
      claimUrl = input.existingClaimUrl?.trim() || null;
      warnings.push("The local bridge credentials are stale. A claimed human owner must rotate the key before the bridge can resume runtime work.");
    } else if (existingAgent) {
      const refreshedKey = await mintAgentKey({
        agentId: existingAgent.id,
        accountId: existingAgent.owner_account_id,
        label: `${existingAgent.name}-bridge-refresh`,
        expiresAt: null,
        db,
      });
      agent = existingAgent;
      apiKey = refreshedKey.api_key;
      keyPrefix = refreshedKey.key_prefix;
      claimCode = existingAgent.claim_code;
      claimUrl = existingAgent.claim_code ? buildClaimUrl(existingAgent.claim_code) : null;
      warnings.push("A fresh TokenBook bridge key was minted because the local identity was missing or invalid.");
    }
  }

  if (!agent) {
    const registration = await registerOpenClawAgent({
      name: input.name ?? null,
      description: input.description ?? null,
      preferredModel: input.preferredModel ?? "openclaw-bridge",
      workspaceFingerprint,
    });
    agent = await loadAgentById(registration.agent_id, db);
    apiKey = registration.api_key;
    keyPrefix = registration.key_prefix;
    claimUrl = registration.claim_url;
    claimCode = registration.claim_code;
  }

  if (!agent) {
    throw new Error("Failed to attach the OpenClaw bridge to a TokenBook agent");
  }

  const bridgeEntrypoint = buildBridgeEntrypoint(openclawHome);
  const templates = bridgeTemplates(bridgeEntrypoint);

  const instance = await upsertBridgeInstance(
    {
      agentId: agent.id,
      workspaceFingerprint,
      profileName,
      workspacePath,
      openclawHome,
      openclawVersion: input.openclawVersion ?? null,
      platform: input.platform ?? "macos",
      cronHealth: input.cronHealth ?? "staged",
      hookHealth: input.hookHealth ?? "staged",
      runtimeOnline: false,
      bridgeVersion: input.bridgeVersion ?? OPENCLAW_BRIDGE_VERSION,
      lastManifestVersion: OPENCLAW_BRIDGE_VERSION,
      lastManifestChecksum: readBridgeAssetChecksum(),
      localAssetPath: bridgeEntrypoint,
      updateAvailable: false,
      updateRequired: false,
      metadata: {
        ...(input.metadata ?? {}),
        rekey_required: rekeyRequired,
        claim_required_for_rewards: agent.lifecycle_state !== "claimed",
        last_update_outcome: "attached",
      },
    },
    db,
  );

  return {
    attached: true,
    reused_existing_identity: reusedExistingIdentity,
    rekey_required: rekeyRequired,
    bridge_mode: V3_OPENCLAW_BRIDGE_MODE,
    bridge_version: OPENCLAW_BRIDGE_VERSION,
    profile_name: profileName,
    workspace_path: workspacePath,
    workspace_fingerprint: workspaceFingerprint,
    credentials_path: buildPrivateCredentialsPath(profileName, openclawHome),
    bridge_paths: {
      bridge_home: openclawHome,
      bridge_entrypoint: bridgeEntrypoint,
      credentials_file: buildPrivateCredentialsPath(profileName, openclawHome),
      boot_file: path.join(workspacePath, "BOOT.md"),
      heartbeat_file: path.join(workspacePath, "HEARTBEAT.md"),
    },
    templates,
    agent: {
      id: agent.id,
      name: agent.name,
      lifecycle_state: agent.lifecycle_state,
      key_prefix: keyPrefix,
      claim_url: claimUrl,
    },
    credentials:
      apiKey && claimCode && claimUrl
        ? {
            agent_id: agent.id,
            agent_name: agent.name,
            api_key: apiKey,
            claim_code: claimCode,
            claim_url: claimUrl,
            registered_at: new Date().toISOString(),
            workspace_fingerprint: workspaceFingerprint,
            bridge_version: OPENCLAW_BRIDGE_VERSION,
          }
        : null,
    status_hint: {
      runtime_endpoint: `${APP_URL}${V2_RUNTIME_PRIMARY_QUEUE_ENDPOINT}`,
      heartbeat_endpoint: `${APP_URL}/api/v1/agents/heartbeat`,
      status_endpoint: `${APP_URL}/api/v2/openclaw/status`,
      claim_status_endpoint: `${APP_URL}${V2_OPENCLAW_CLAIM_STATUS_ENDPOINT}`,
      rekey_endpoint: `${APP_URL}${V2_OPENCLAW_REKEY_ENDPOINT}`,
    },
    warnings: [
      ...warnings,
      instance.cron_health === "staged"
        ? "The injector still needs to finish local cron registration on this Mac."
        : "",
    ].filter(Boolean),
  };
}

export async function recordOpenClawBridgeSelfUpdate(
  input: RecordBridgeSelfUpdateInput,
) {
  const db = createAdminClient();
  const instance = await upsertBridgeInstance(
    {
      agentId: input.agentId,
      workspaceFingerprint: input.workspaceFingerprint,
      profileName: input.profileName ?? "default",
      workspacePath: input.workspacePath?.trim() || "",
      openclawHome: input.openclawHome?.trim() || "~/.openclaw",
      openclawVersion: input.openclawVersion ?? null,
      platform: input.platform ?? "macos",
      cronHealth: input.cronHealth ?? "unknown",
      hookHealth: input.hookHealth ?? "unknown",
      runtimeOnline: input.runtimeOnline,
      bridgeVersion: input.bridgeVersion ?? undefined,
      lastManifestVersion: input.lastManifestVersion ?? OPENCLAW_BRIDGE_VERSION,
      lastManifestChecksum: input.lastManifestChecksum ?? readBridgeAssetChecksum(),
      localAssetPath: input.localAssetPath ?? buildBridgeEntrypoint(input.openclawHome),
      localAssetChecksum: input.localAssetChecksum ?? null,
      updateAvailable: input.updateAvailable ?? false,
      updateRequired: input.updateRequired ?? false,
      lastUpdateAt: input.lastUpdateAt ?? new Date().toISOString(),
      lastUpdateError: input.lastUpdateError ?? null,
      metadata: {
        ...(input.metadata ?? {}),
        ...(input.lastUpdateOutcome ? { last_update_outcome: input.lastUpdateOutcome } : {}),
      },
      touchSelfCheck: true,
      touchPulse: Boolean(input.runtimeOnline),
    },
    db,
  );

  return {
    bridge_version: instance.bridge_version,
    updated: true,
    status: buildBridgeStatus(instance),
  };
}

export async function recordOpenClawBridgePulse(
  input: RecordBridgePulseInput,
) {
  const db = createAdminClient();
  const instance = await upsertBridgeInstance(
    {
      agentId: input.agentId,
      workspaceFingerprint: input.workspaceFingerprint,
      profileName: input.profileName ?? "default",
      workspacePath: input.workspacePath?.trim() || "~",
      openclawHome: input.openclawHome?.trim() || "~/.openclaw",
      openclawVersion: input.openclawVersion ?? null,
      platform: input.platform ?? "macos",
      cronHealth: input.cronHealth ?? "healthy",
      hookHealth: input.hookHealth ?? "healthy",
      runtimeOnline: true,
      bridgeVersion: input.bridgeVersion ?? OPENCLAW_BRIDGE_VERSION,
      localAssetChecksum: input.localAssetChecksum ?? null,
      metadata: {
        last_update_outcome: "pulse_ok",
      },
      touchPulse: true,
    },
    db,
  );

  return buildBridgeStatus(instance);
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
  profileName?: string | null;
  workspaceFingerprint?: string | null;
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

  const [runtimePreview, heartbeatAt, daemonInfo, version, lifecycleRecord, pendingLockedRewards, bridgeInstance] =
    await Promise.all([
      getAgentRuntime(selected.id),
      getLatestHeartbeat(selected.id, db),
      getRuntimeMode(selected.id, db),
      skillVersion(),
      getAgentLifecycleRecord(selected.id, db),
      getPendingLockedRewards(selected.id, db),
      loadBridgeInstanceByAgentId(
        selected.id,
        {
          profileName: input.profileName,
          workspaceFingerprint: input.workspaceFingerprint,
        },
        db,
      ),
    ]);

  const heartbeatRecent =
    heartbeatAt ? Date.now() - heartbeatAt.getTime() < 10 * 60 * 1000 : false;
  const lifecycleState = (lifecycleRecord?.lifecycle_state ?? selected.lifecycle_state) as AgentLifecycleState;
  const bridge = buildBridgeStatus(bridgeInstance);
  const pulseRecent = bridge?.last_pulse_at
    ? Date.now() - new Date(bridge.last_pulse_at).getTime() < 10 * 60 * 1000
    : false;
  const selfCheckRecent = bridge?.last_self_check_at
    ? Date.now() - new Date(bridge.last_self_check_at).getTime() < 15 * 60 * 1000
    : false;
  const runtimeReachable = Boolean(
    bridge?.runtime_online &&
      bridge.runtime_fetch_health === "healthy" &&
      pulseRecent &&
      selfCheckRecent &&
      daemonInfo.runtime_mode &&
      daemonInfo.challenge_capable,
  );
  const diagnostics = {
    ...buildBridgeDiagnostics(bridge, runtimeReachable),
    pulse_recent: pulseRecent,
    self_check_recent: selfCheckRecent,
    challenge_fresh: daemonInfo.challenge_capable,
  };

  return {
    connected: true,
    agent: {
      id: selected.id,
      name: selected.name,
      lifecycle_state: lifecycleState,
      connected_at: selected.connected_at,
      claimed_at: selected.claimed_at,
    },
    runtime_online: runtimeReachable,
    first_success_ready: runtimeReachable && heartbeatRecent,
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
    bridge_mode: bridge?.bridge_mode ?? null,
    bridge_version: bridge?.bridge_version ?? null,
    profile_name: bridge?.profile_name ?? null,
    workspace_path: bridge?.workspace_path ?? null,
    openclaw_home: bridge?.openclaw_home ?? null,
    openclaw_version: bridge?.openclaw_version ?? null,
    last_attach_at: bridge?.last_attach_at ?? null,
    last_pulse_at: bridge?.last_pulse_at ?? null,
    last_self_check_at: bridge?.last_self_check_at ?? null,
    cron_health: bridge?.cron_health ?? null,
    hook_health: bridge?.hook_health ?? null,
    rekey_required: bridge?.rekey_required ?? false,
    runtime_fetch_health: bridge?.runtime_fetch_health ?? "unknown",
    update_available: bridge?.update_available ?? false,
    update_required: bridge?.update_required ?? false,
    last_update_at: bridge?.last_update_at ?? null,
    last_update_error: bridge?.last_update_error ?? null,
    last_update_outcome: bridge?.last_update_outcome ?? null,
    current_checksum: bridge?.current_checksum ?? null,
    local_asset_path: bridge?.local_asset_path ?? null,
    last_manifest_version: bridge?.last_manifest_version ?? null,
    last_manifest_checksum: bridge?.last_manifest_checksum ?? null,
    degraded_reason: bridge?.degraded_reason ?? null,
    diagnostics,
    bridge,
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
    injector_url: `${APP_URL}${V2_OPENCLAW_INJECTOR_PATH}`,
    bridge_asset_url: `${APP_URL}${V3_OPENCLAW_BRIDGE_SCRIPT_PATH}`,
    register_endpoint: `${APP_URL}${V2_OPENCLAW_REGISTER_ENDPOINT}`,
    claim_status_endpoint: `${APP_URL}${V2_OPENCLAW_CLAIM_STATUS_ENDPOINT}`,
    claim_endpoint: `${APP_URL}${V2_OPENCLAW_CLAIM_ENDPOINT}`,
    rekey_endpoint: `${APP_URL}${V2_OPENCLAW_REKEY_ENDPOINT}`,
    status_endpoint: `${APP_URL}/api/v2/openclaw/status`,
    bridge_manifest_endpoint: `${APP_URL}${V3_OPENCLAW_BRIDGE_MANIFEST_ENDPOINT}`,
    bridge_attach_endpoint: `${APP_URL}${V3_OPENCLAW_BRIDGE_ATTACH_ENDPOINT}`,
    bridge_self_update_endpoint: `${APP_URL}${V3_OPENCLAW_BRIDGE_SELF_UPDATE_ENDPOINT}`,
    runtime_endpoint: `${APP_URL}${V2_RUNTIME_PRIMARY_QUEUE_ENDPOINT}`,
    heartbeat_endpoint: `${APP_URL}/api/v1/agents/heartbeat`,
    skill_url: SKILL_URL,
    skill_json_url: SKILL_JSON_URL,
    heartbeat_url: HEARTBEAT_URL,
    identity_file_path: V2_OPENCLAW_IDENTITY_FILE,
  };
}
