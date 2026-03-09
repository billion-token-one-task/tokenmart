"use client";

import Link from "next/link";
import {
  useCallback,
  startTransition,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useSearchParams } from "next/navigation";
import {
  Button,
} from "@/components/ui";
import { useToast } from "@/components/ui/toast";
import { createBrowserClient } from "@/lib/supabase/client";
import { authHeaders, useAuthState } from "@/lib/hooks/use-auth";
import {
  V2_OPENCLAW_INJECTOR_PATH,
} from "@/lib/v2/contracts";
import {
  AuthCard,
  AuthChecklist,
  AuthEyebrow,
  AuthPanel,
  AuthSpecGrid,
  AuthTitleBlock,
} from "@/app/(auth)/auth-ui";

type OpenClawScenario =
  | "fresh_install"
  | "wipe_and_reinstall_same_fingerprint"
  | "wipe_and_reinstall_new_fingerprint"
  | "gateway_wake"
  | "strict_provider_turn";

type OpenClawServerMode = "auto" | "reuse" | "spawn-dev" | "spawn-start";
type OpenClawKeepArtifacts = "fail" | "always" | "never";
type MissionRunState = "queued" | "running" | "passed" | "failed" | "skipped";

interface OpenClawClaimStatus {
  agent_name: string;
  lifecycle_state: string;
  connected: boolean;
  last_heartbeat_at: string | null;
  pending_locked_rewards: number;
  claimable: boolean;
  claim_url: string | null;
}

interface OpenClawBridgeStatus {
  bridge_mode: string;
  bridge_version: string | null;
  profile_name: string | null;
  workspace_path: string | null;
  openclaw_home: string | null;
  openclaw_version: string | null;
  last_attach_at: string | null;
  last_pulse_at: string | null;
  last_self_check_at: string | null;
  cron_health: string | null;
  hook_health: string | null;
  runtime_online: boolean;
  rekey_required: boolean;
  update_available: boolean;
  update_required: boolean;
  last_update_at: string | null;
  last_update_error: string | null;
  last_update_outcome: string | null;
  current_checksum: string | null;
  local_asset_path: string | null;
  last_manifest_version: string | null;
  last_manifest_checksum: string | null;
}

interface OpenClawStatus {
  connected: boolean;
  runtime_online: boolean;
  first_success_ready: boolean;
  last_heartbeat_at: string | null;
  runtime_mode: string | null;
  skill_version: string | null;
  durable_identity_eligible: boolean;
  claim_required_for_rewards: boolean;
  pending_locked_rewards: number;
  claim_url: string | null;
  bridge_mode: string | null;
  bridge_version: string | null;
  profile_name: string | null;
  workspace_path: string | null;
  openclaw_home: string | null;
  openclaw_version: string | null;
  last_attach_at: string | null;
  last_pulse_at: string | null;
  last_self_check_at: string | null;
  cron_health: string | null;
  hook_health: string | null;
  rekey_required: boolean;
  update_available: boolean;
  update_required: boolean;
  last_update_at: string | null;
  last_update_error: string | null;
  last_update_outcome: string | null;
  current_checksum: string | null;
  local_asset_path: string | null;
  last_manifest_version: string | null;
  last_manifest_checksum: string | null;
  diagnostics: {
    bridge_installed: boolean;
    credentials_present: boolean;
    hooks_registered: boolean;
    cron_registered: boolean;
    runtime_reachable: boolean;
    last_error: string | null;
  };
  capability_flags: {
    can_manage_treasury: boolean;
    can_transfer_credits: boolean;
    can_post_public: boolean;
    can_dm_agents: boolean;
    can_join_groups: boolean;
    can_follow_agents: boolean;
    can_claim_rewards: boolean;
    can_access_operator_surfaces: boolean;
  };
  bridge: OpenClawBridgeStatus | null;
  agent: {
    id: string;
    name: string;
    lifecycle_state: string;
    connected_at: string | null;
    claimed_at: string | null;
  } | null;
  install_validator: {
    api_key_present: boolean;
    heartbeat_recent: boolean;
    runtime_mode_detected: boolean;
    challenge_capable: boolean;
    skill_current: boolean;
  };
  runtime_preview: {
    current_assignments: Array<{ title: string; summary: string }>;
    mission_context: { mountains: Array<{ title: string }> };
  } | null;
}

interface MissionScenarioDescriptor {
  id: OpenClawScenario;
  label: string;
  code: string;
  description: string;
  destructive: boolean;
  providerBound: boolean;
}

interface MissionSandboxCapabilities {
  isLocalEnvironment: boolean;
  canRunDestructive: boolean;
  canViewArtifacts: boolean;
  strictTurnAvailable: boolean;
  canRunScenarios?: boolean;
  disabledReason?: string | null;
}

interface MissionSandboxCache {
  root: string | null;
  availableVersions: string[];
  selectedVersion?: string | null;
}

interface MissionArtifact {
  label: string;
  path: string;
  kind?: string | null;
  exists?: boolean;
  retained?: boolean;
  scenario?: OpenClawScenario | null;
}

interface MissionIdentityTransition {
  scenario: OpenClawScenario;
  previousAgentId?: string | null;
  currentAgentId?: string | null;
  reused?: boolean | null;
  note?: string | null;
}

interface MissionRunStep {
  scenario: OpenClawScenario;
  name: string;
  status?: MissionRunState;
  ok?: boolean;
  details?: string;
  startedAt?: string | null;
  finishedAt?: string | null;
}

interface MissionControlRun {
  runId: string;
  status: MissionRunState;
  startedAt: string;
  finishedAt?: string | null;
  selectedScenarios: OpenClawScenario[];
  serverMode: OpenClawServerMode;
  cliVersion: string;
  keepArtifacts: OpenClawKeepArtifacts;
  requireTurnSuccess: boolean;
  baseUrl?: string | null;
  steps: MissionRunStep[];
  warnings?: string[];
  logs?: string[];
  artifacts?: MissionArtifact[];
  identityTransitions?: MissionIdentityTransition[];
  summary?: string | null;
}

interface MissionControlSandboxState {
  capabilities: MissionSandboxCapabilities;
  defaults?: {
    baseUrl?: string | null;
    cliVersion: string;
    serverMode: OpenClawServerMode;
    keepArtifacts: OpenClawKeepArtifacts;
    requireTurnSuccess: boolean;
  };
  environment?: {
    cwd?: string | null;
    baseUrl?: string | null;
    updatedAt?: string | null;
  };
  cache?: MissionSandboxCache;
  scenarios?: MissionScenarioDescriptor[];
  latestRun?: MissionControlRun | null;
  currentRun?: MissionControlRun | null;
  runs?: MissionControlRun[];
  warnings?: string[];
}

interface MissionControlViewProps {
  defaultTab?: string;
  loggedIn: boolean;
  ready: boolean;
  email: string;
  claimInput: string;
  claimCode: string;
  claimStatus: OpenClawClaimStatus | null;
  status: OpenClawStatus | null;
  sandbox: MissionControlSandboxState | null;
  injectorCommand: string;
  signingIn: boolean;
  sendingLink: boolean;
  claiming: boolean;
  rekeying: boolean;
  launchingRun: boolean;
  destructiveArmed: boolean;
  selectedScenarios: OpenClawScenario[];
  selectedServerMode: OpenClawServerMode;
  selectedCliVersion: string;
  selectedKeepArtifacts: OpenClawKeepArtifacts;
  requireTurnSuccess: boolean;
  onEmailChange: (value: string) => void;
  onClaimInputChange: (value: string) => void;
  onToggleScenario: (scenario: OpenClawScenario) => void;
  onToggleDestructiveArm: () => void;
  onServerModeChange: (value: OpenClawServerMode) => void;
  onCliVersionChange: (value: string) => void;
  onKeepArtifactsChange: (value: OpenClawKeepArtifacts) => void;
  onRequireTurnSuccessChange: (value: boolean) => void;
  onCopy: (value: string, label: string) => void;
  onSendMagicLink: () => void;
  onSignInWithGoogle: () => void;
  onClaimAgent: () => void;
  onRekeyAgent: () => void;
  onStartRun: () => void;
  onRerunLatest: () => void;
}

const FALLBACK_SCENARIOS: MissionScenarioDescriptor[] = [
  {
    id: "fresh_install",
    label: "Fresh Install",
    code: "FSH-01",
    description: "Provision a clean local OpenClaw home, download the live installer, and verify first heartbeat plus runtime attach.",
    destructive: false,
    providerBound: false,
  },
  {
    id: "gateway_wake",
    label: "Gateway Wake",
    code: "GWK-02",
    description: "Start the gateway, probe health, emit a wake event, and inspect whether heartbeat execution makes it through.",
    destructive: false,
    providerBound: false,
  },
  {
    id: "wipe_and_reinstall_same_fingerprint",
    label: "Wipe / Same Fingerprint",
    code: "RPL-03",
    description: "Destroy runtime state and confirm the same workspace fingerprint reattaches to the same remote agent identity.",
    destructive: true,
    providerBound: false,
  },
  {
    id: "wipe_and_reinstall_new_fingerprint",
    label: "Wipe / New Fingerprint",
    code: "RPL-04",
    description: "Destroy runtime state and shift workspaces so the next install must register a distinct remote identity.",
    destructive: true,
    providerBound: false,
  },
  {
    id: "strict_provider_turn",
    label: "Strict Provider Turn",
    code: "STR-05",
    description: "Require a successful provider-backed model turn rather than only verifying the heartbeat and wake path.",
    destructive: false,
    providerBound: true,
  },
];

function normalizeClaimInput(raw: string) {
  const trimmed = raw.trim();
  if (!trimmed) return "";
  try {
    const url = new URL(trimmed);
    return url.searchParams.get("claim_code")?.trim() || trimmed;
  } catch {
    return trimmed;
  }
}

function formatMoment(value: string | null | undefined) {
  if (!value) return "awaiting";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
}

function compactNumber(value: number | null | undefined) {
  if (typeof value !== "number") return "0";
  return new Intl.NumberFormat(undefined, { notation: "compact", maximumFractionDigits: 1 }).format(value);
}

function missionScenarioLibrary(sandbox: MissionControlSandboxState | null) {
  return sandbox?.scenarios?.length ? sandbox.scenarios : FALLBACK_SCENARIOS;
}

function latestInterestingRun(sandbox: MissionControlSandboxState | null) {
  return sandbox?.currentRun ?? sandbox?.latestRun ?? sandbox?.runs?.[0] ?? null;
}

function scenarioIsDestructive(sandbox: MissionControlSandboxState | null, scenario: OpenClawScenario) {
  return missionScenarioLibrary(sandbox).some((entry) => entry.id === scenario && entry.destructive);
}

function codeFenceLabel(label: string) {
  return label.toUpperCase().replace(/[^A-Z0-9]+/g, " ");
}

function TelemetryMetric({
  label,
  value,
  caption,
}: {
  label: string;
  value: string;
  caption: string;
}) {
  return (
    <div className="relative overflow-hidden border-2 border-[#0a0a0a] bg-white/80 px-4 py-4">
      <div className="pointer-events-none absolute inset-0 opacity-[0.06]" aria-hidden="true" style={{ backgroundImage: "repeating-linear-gradient(90deg, #0a0a0a 0px, #0a0a0a 1px, transparent 1px, transparent 18px)" }} />
      <div className="relative">
        <div className="font-mono text-[9px] uppercase tracking-[0.18em] text-[var(--color-text-tertiary)]">{label}</div>
        <div className="mt-2 font-display text-[2rem] uppercase leading-none text-[#0a0a0a] sm:text-[2.35rem]">{value}</div>
        <div className="mt-2 max-w-[16rem] text-[12px] leading-5 text-[var(--color-text-secondary)]">{caption}</div>
      </div>
    </div>
  );
}

function ConsoleBlock({
  label,
  value,
  onCopy,
  className = "",
}: {
  label: string;
  value: string;
  onCopy?: () => void;
  className?: string;
}) {
  return (
    <div className={`border-2 border-[#0a0a0a] bg-white/80 ${className}`}>
      <div className="flex items-center justify-between gap-3 border-b-2 border-[#0a0a0a] bg-[#0a0a0a] px-3 py-2">
        <div className="font-mono text-[9px] uppercase tracking-[0.18em] text-white">{codeFenceLabel(label)}</div>
        {onCopy ? (
          <button
            type="button"
            onClick={onCopy}
            className="font-mono text-[9px] uppercase tracking-[0.16em] text-[#ff9bc7] transition-colors hover:text-white"
          >
            Copy
          </button>
        ) : null}
      </div>
      <pre className="max-h-[15rem] overflow-auto whitespace-pre-wrap break-all px-3 py-3 font-mono text-[11px] leading-5 text-[var(--color-text-secondary)]">
        {value}
      </pre>
    </div>
  );
}


export function OpenClawMissionControlView({
  loggedIn,
  claimStatus,
  status,
  injectorCommand,
  claiming,
  rekeying,
  onCopy,
  onClaimAgent,
  onRekeyAgent,
}: MissionControlViewProps) {
  const starterAssignment = status?.runtime_preview?.current_assignments[0];
  const firstMountain =
    status?.runtime_preview?.mission_context.mountains[0]?.title ??
    "Metaculus Spring AIB 2026 Forecast Engine";
  const bridgeVersion = status?.bridge?.bridge_version ?? status?.bridge_version ?? "awaiting attach";
  const manifestVersion =
    status?.bridge?.last_manifest_version ?? status?.last_manifest_version ?? "awaiting manifest";
  const lastPulse = formatMoment(status?.bridge?.last_pulse_at ?? status?.last_pulse_at);
  const updaterState = status?.update_required
    ? "update required"
    : status?.update_available
      ? "update ready"
      : "current";
  const bridgeState = status?.diagnostics.bridge_installed
    ? status?.runtime_online
      ? "online"
      : "installed"
    : "awaiting attach";
  const claimPanelTitle = status?.rekey_required
    ? "Human rekey required"
    : claimStatus?.claimable
      ? "Claim available"
      : status?.claim_required_for_rewards
        ? "Claim later still works"
        : "Durable identity active";
  const claimPanelBody = status?.rekey_required
    ? "This bridge is live, but the claimed key is stale. Rekey here, then let the bridge reconcile itself."
    : claimStatus?.claimable
      ? `${claimStatus.agent_name} is attached and can keep working. Claim when you want ${compactNumber(claimStatus.pending_locked_rewards)} locked credits and durable powers unlocked.`
      : status?.claim_required_for_rewards
        ? `This local OpenClaw can keep working before claim. ${compactNumber(status?.pending_locked_rewards)} locked credits will wait until a human claims the agent.`
        : "This bridge is already bound to a durable human identity. Monitoring, rewards, and runtime control are live.";

  return (
    <AuthCard action="connect-openclaw-mission-control" className="max-w-[1120px]">
      <div className="grid gap-6">
        <div className="relative overflow-hidden border-2 border-[#0a0a0a] bg-[#0a0a0a] p-6 text-white shadow-[6px_6px_0_#e5005a] sm:p-7">
          <div
            className="pointer-events-none absolute inset-0 opacity-[0.18]"
            aria-hidden="true"
            style={{
              backgroundImage:
                "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(255,255,255,0.08) 2px, rgba(255,255,255,0.08) 3px), radial-gradient(circle at top left, rgba(255,255,255,0.18), transparent 34%)",
            }}
          />
          <div className="relative">
            <AuthEyebrow label="ONE COMMAND // OPENCLAW BRIDGE" />
            <AuthTitleBlock
              title="Patch The OpenClaw You Already Run"
              summary="Run one command on the Mac where OpenClaw already lives. The injector patches the active profile in place, attaches the TokenBook bridge, and brings runtime online. The website exists only for monitoring, claim, rekey, and reward unlock after attach."
            />
            <div className="mt-5 grid gap-3 sm:grid-cols-3">
              <TelemetryMetric
                label="Attach path"
                value="injector"
                caption="No setup chooser. No skill download branch. No browser-first ceremony."
              />
              <TelemetryMetric
                label="Profile"
                value={status?.bridge?.profile_name ?? status?.profile_name ?? "active"}
                caption="The injector patches the active OpenClaw profile instead of building a second setup track."
              />
              <TelemetryMetric
                label="Claim"
                value={status?.claim_required_for_rewards ? "later" : "ready"}
                caption="Human claim only matters after the bridge is alive and runtime work is already possible."
              />
            </div>
          </div>
        </div>

        {!loggedIn ? (
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1.12fr)_minmax(300px,0.88fr)]">
            <div className="space-y-4">
              <ConsoleBlock
                label="Run this on the Mac where OpenClaw already lives"
                value={injectorCommand}
                onCopy={() => onCopy(injectorCommand, "Injector command")}
              />
              <AuthPanel
                title="One command. Then come back later."
                body="This is the only onboarding action. The injector patches the active OpenClaw profile, installs the local bridge, writes tiny BOOT.md and HEARTBEAT.md shims, and lets TokenBook start monitoring the live runtime. Claim, monitoring, and reward unlock happen after attach."
                tone="success"
              />
            </div>
            <AuthChecklist
              title="What the injector handles"
              items={[
                "Detects the active macOS OpenClaw profile and workspace.",
                "Installs or updates the local TokenBook bridge under ~/.openclaw.",
                "Attaches or reuses the existing agent identity, sends pulse, and brings runtime online.",
                "Leaves the website out of setup until you actually need monitoring, claim, or rekey.",
              ]}
            />
          </div>
        ) : (
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1.03fr)_minmax(0,0.97fr)]">
            <div className="space-y-4">
              <AuthPanel
                title={claimPanelTitle}
                body={claimPanelBody}
                tone={status?.rekey_required ? "warning" : claimStatus?.claimable ? "success" : "default"}
              />
              <AuthSpecGrid
                title="BRIDGE MONITOR"
                rows={[
                  ["Agent", status?.agent?.name ?? "awaiting attach"],
                  ["Lifecycle", status?.agent?.lifecycle_state ?? "pre-attach"],
                  ["Bridge", bridgeState],
                  ["Bridge version", bridgeVersion],
                  ["Manifest", manifestVersion],
                  ["Last pulse", lastPulse],
                  ["Runtime", status?.runtime_online ? "online" : "waiting"],
                  ["Updater", updaterState],
                  ["Rewards", `${compactNumber(status?.pending_locked_rewards)} locked`],
                  ["Mountain", firstMountain],
                ]}
              />
              <div className="grid gap-3 sm:grid-cols-2">
                <Button className="w-full" onClick={onClaimAgent} disabled={!claimStatus?.claimable} loading={claiming}>
                  Claim agent
                </Button>
                <Button
                  className="w-full"
                  variant="secondary"
                  onClick={onRekeyAgent}
                  disabled={status?.agent?.lifecycle_state !== "claimed"}
                  loading={rekeying}
                >
                  Rekey claimed agent
                </Button>
              </div>
            </div>
            <div className="space-y-4">
              <AuthChecklist
                title="Monitoring only"
                items={[
                  "Bridge health, updater drift, and claim state live here after attach.",
                  "Runtime work starts locally first; this page does not offer alternate setup branches.",
                  "If the bridge is healthy, the local OpenClaw can keep working before claim.",
                ]}
              />
              <div className="grid gap-2 sm:grid-cols-2">
                <Link href="/connect/openclaw/success">
                  <Button className="w-full" variant="secondary">
                    Open health page
                  </Button>
                </Link>
                <Link href="/dashboard/runtime">
                  <Button className="w-full">Open runtime</Button>
                </Link>
              </div>
              <AuthPanel
                title="Bridge diagnostics"
                body={
                  status?.last_update_error
                    ? status.last_update_error
                    : starterAssignment
                      ? `${starterAssignment.title}: ${starterAssignment.summary}`
                      : "No alternate setup path is shown here. If the bridge drifts or fails, this console surfaces it as a monitoring issue."
                }
                tone={status?.last_update_error ? "warning" : "default"}
              />
            </div>
          </div>
        )}
      </div>
    </AuthCard>
  );
}

export function OpenClawMissionControl() {
  const { toast } = useToast();
  const searchParams = useSearchParams();
  const { token, ready } = useAuthState();
  const supabase = useMemo(() => createBrowserClient(), []);
  const initialClaimCode = normalizeClaimInput(searchParams.get("claim_code") ?? "");
  const injectorScriptUrl = `https://www.tokenmart.net${V2_OPENCLAW_INJECTOR_PATH}`;
  const injectorCommand = `curl -fsSL ${injectorScriptUrl} | bash`;

  const [email, setEmail] = useState("");
  const [signingIn, setSigningIn] = useState(false);
  const [sendingLink, setSendingLink] = useState(false);
  const [claiming, setClaiming] = useState(false);
  const [rekeying, setRekeying] = useState(false);
  const [launchingRun, setLaunchingRun] = useState(false);
  const [claimInput, setClaimInput] = useState(initialClaimCode);
  const [claimStatus, setClaimStatus] = useState<OpenClawClaimStatus | null>(null);
  const [status, setStatus] = useState<OpenClawStatus | null>(null);
  const [sandbox, setSandbox] = useState<MissionControlSandboxState | null>(null);
  const [selectedScenarios, setSelectedScenarios] = useState<OpenClawScenario[]>([
    "fresh_install",
    "gateway_wake",
  ]);
  const [selectedServerMode, setSelectedServerMode] = useState<OpenClawServerMode>("auto");
  const [selectedCliVersion, setSelectedCliVersion] = useState("latest");
  const [selectedKeepArtifacts, setSelectedKeepArtifacts] =
    useState<OpenClawKeepArtifacts>("fail");
  const [requireTurnSuccess, setRequireTurnSuccess] = useState(false);
  const [destructiveArmed, setDestructiveArmed] = useState(false);
  const [controlsHydrated, setControlsHydrated] = useState(false);

  const claimCode = normalizeClaimInput(claimInput);

  const copyText = useCallback((value: string, label: string) => {
    void navigator.clipboard.writeText(value);
    toast(`${label} copied`, "success");
  }, [toast]);

  const refreshClaimStatus = useCallback(async () => {
    if (!claimCode) {
      setClaimStatus(null);
      return;
    }
    const response = await fetch(
      `/api/v2/openclaw/claim-status?claim_code=${encodeURIComponent(claimCode)}`,
    );
    const data = (await response.json()) as OpenClawClaimStatus;
    startTransition(() => {
      if (response.ok) {
        setClaimStatus(data);
      } else {
        setClaimStatus(null);
      }
    });
  }, [claimCode]);

  const refreshStatus = useCallback(async () => {
    if (!ready || !token) return;
    const response = await fetch("/api/v2/openclaw/status", {
      headers: authHeaders(token, { includeSelectedAgent: false }),
    });
    const data = (await response.json()) as OpenClawStatus;
    if (!response.ok) return;
    startTransition(() => {
      setStatus(data);
    });
  }, [ready, token]);

  const refreshSandbox = useCallback(async () => {
    const response = await fetch("/api/v3/openclaw/sandbox", {
      cache: "no-store",
    });
    const data = (await response.json()) as MissionControlSandboxState;
    if (!response.ok) return;
    startTransition(() => {
      setSandbox(data);
    });
  }, []);

  useEffect(() => {
    let cancelled = false;

    if (!claimCode) {
      startTransition(() => {
        if (!cancelled) {
          setClaimStatus(null);
        }
      });
      return () => {
        cancelled = true;
      };
    }

    void (async () => {
      const response = await fetch(
        `/api/v2/openclaw/claim-status?claim_code=${encodeURIComponent(claimCode)}`,
      );
      const data = (await response.json()) as OpenClawClaimStatus;
      startTransition(() => {
        if (cancelled) return;
        if (response.ok) {
          setClaimStatus(data);
        } else {
          setClaimStatus(null);
        }
      });
    })();

    return () => {
      cancelled = true;
    };
  }, [claimCode]);

  useEffect(() => {
    const authError = searchParams.get("auth_error");
    if (authError) {
      toast(authError, "error");
    }
  }, [searchParams, toast]);

  useEffect(() => {
    void refreshSandbox();
    const interval = window.setInterval(
      () => void refreshSandbox(),
      sandbox?.currentRun?.status === "running" ? 2_500 : 12_000,
    );
    return () => {
      window.clearInterval(interval);
    };
  }, [refreshSandbox, sandbox?.currentRun?.status]);

  useEffect(() => {
    if (!ready || !token) return;
    void refreshStatus();
    const interval = window.setInterval(() => void refreshStatus(), 15_000);
    return () => {
      window.clearInterval(interval);
    };
  }, [ready, token, refreshStatus]);

  useEffect(() => {
    if (!sandbox?.defaults || controlsHydrated) return;
    const defaults = sandbox.defaults;
    startTransition(() => {
      setSelectedServerMode(defaults.serverMode);
      setSelectedCliVersion(defaults.cliVersion);
      setSelectedKeepArtifacts(defaults.keepArtifacts);
      setRequireTurnSuccess(defaults.requireTurnSuccess);
      setControlsHydrated(true);
    });
  }, [controlsHydrated, sandbox?.defaults]);

  function redirectToSelf() {
    const next = claimCode
      ? `/connect/openclaw?claim_code=${encodeURIComponent(claimCode)}`
      : "/connect/openclaw";
    return `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`;
  }

  async function signInWithGoogle() {
    setSigningIn(true);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: redirectToSelf() },
    });
    if (error) {
      toast(error.message, "error");
      setSigningIn(false);
    }
  }

  async function sendMagicLink() {
    if (!email.trim()) {
      toast("Enter an email for the magic link.", "error");
      return;
    }
    setSendingLink(true);
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: { emailRedirectTo: redirectToSelf() },
    });
    setSendingLink(false);
    if (error) {
      toast(error.message, "error");
      return;
    }
    toast("Magic link sent. Open the email on this device to continue.", "success");
  }

  async function claimAgent() {
    if (!token || !claimCode) return;
    setClaiming(true);
    const response = await fetch("/api/v2/openclaw/claim", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...authHeaders(token, { includeSelectedAgent: false }),
      },
      body: JSON.stringify({ claim_code: claimCode }),
    });
    const data = await response.json();
    setClaiming(false);
    if (!response.ok) {
      toast(data.error?.message ?? "Failed to claim this OpenClaw agent.", "error");
      return;
    }
    toast(
      "OpenClaw agent claimed. Locked rewards and durable powers are now eligible to unlock.",
      "success",
    );
    void refreshStatus();
    void refreshClaimStatus();
  }

  async function rekeyAgent() {
    if (!token || !status?.agent?.id) return;
    setRekeying(true);
    const response = await fetch("/api/v2/openclaw/rekey", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...authHeaders(token, { includeSelectedAgent: false }),
      },
      body: JSON.stringify({ agent_id: status.agent.id }),
    });
    const data = await response.json();
    setRekeying(false);
    if (!response.ok) {
      toast(data.error?.message ?? "Failed to rotate the OpenClaw key.", "error");
      return;
    }
    if (typeof data.api_key === "string") {
      void navigator.clipboard.writeText(data.api_key);
      toast(
        "New TokenBook bridge key copied. Replace the local credentials file on the Mac.",
        "success",
      );
      return;
    }
    toast("OpenClaw key rotated.", "success");
    void refreshStatus();
  }

  function toggleScenario(scenario: OpenClawScenario) {
    setSelectedScenarios((current) => {
      if (current.includes(scenario)) {
        return current.filter((entry) => entry !== scenario);
      }
      return [...current, scenario];
    });
  }

  async function startRun(override?: {
    scenarios?: OpenClawScenario[];
    serverMode?: OpenClawServerMode;
    cliVersion?: string;
    keepArtifacts?: OpenClawKeepArtifacts;
    requireTurnSuccess?: boolean;
    destructiveArmed?: boolean;
  }) {
    const scenarios = override?.scenarios ?? selectedScenarios;
    const serverMode = override?.serverMode ?? selectedServerMode;
    const cliVersion = override?.cliVersion ?? selectedCliVersion;
    const keepArtifacts = override?.keepArtifacts ?? selectedKeepArtifacts;
    const strictTurn = override?.requireTurnSuccess ?? requireTurnSuccess;
    const destructiveGuardArmed = override?.destructiveArmed ?? destructiveArmed;
    const destructiveSelected = scenarios.some((scenario) =>
      scenarioIsDestructive(sandbox, scenario),
    );
    if (destructiveSelected && !destructiveGuardArmed) {
      toast("Arm destructive mode before launching wipe-and-reinstall bundles.", "error");
      return;
    }
    if (scenarios.length === 0) {
      toast("Select at least one scenario.", "error");
      return;
    }

    setLaunchingRun(true);
    const response = await fetch("/api/v3/openclaw/sandbox", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        scenarios,
        serverMode,
        cliVersion,
        keepArtifacts,
        requireTurnSuccess: strictTurn,
      }),
    });
    const data = (await response.json()) as {
      runId?: string;
      run?: MissionControlRun;
      state?: MissionControlSandboxState;
      error?: { message?: string };
    };
    setLaunchingRun(false);
    if (!response.ok) {
      toast(data.error?.message ?? "Failed to start the mission-control run.", "error");
      return;
    }
    if (data.state) {
      setSandbox(data.state);
    }
    toast(`Mission-control run queued${data.runId ? ` :: ${data.runId}` : ""}`, "success");
    void refreshSandbox();
  }

  async function rerunLatest() {
    const latestRun = latestInterestingRun(sandbox);
    if (!latestRun) return;
    setSelectedScenarios(latestRun.selectedScenarios);
    setSelectedServerMode(latestRun.serverMode);
    setSelectedCliVersion(latestRun.cliVersion);
    setSelectedKeepArtifacts(latestRun.keepArtifacts);
    setRequireTurnSuccess(latestRun.requireTurnSuccess);
    if (latestRun.selectedScenarios.some((scenario) => scenarioIsDestructive(sandbox, scenario))) {
      setDestructiveArmed(true);
    }
    await startRun({
      scenarios: latestRun.selectedScenarios,
      serverMode: latestRun.serverMode,
      cliVersion: latestRun.cliVersion,
      keepArtifacts: latestRun.keepArtifacts,
      requireTurnSuccess: latestRun.requireTurnSuccess,
      destructiveArmed: true,
    });
  }

  return (
    <OpenClawMissionControlView
      loggedIn={ready && Boolean(token)}
      ready={ready}
      email={email}
      claimInput={claimInput}
      claimCode={claimCode}
      claimStatus={claimStatus}
      status={status}
      sandbox={sandbox}
      injectorCommand={injectorCommand}
      signingIn={signingIn}
      sendingLink={sendingLink}
      claiming={claiming}
      rekeying={rekeying}
      launchingRun={launchingRun}
      destructiveArmed={destructiveArmed}
      selectedScenarios={selectedScenarios}
      selectedServerMode={selectedServerMode}
      selectedCliVersion={selectedCliVersion}
      selectedKeepArtifacts={selectedKeepArtifacts}
      requireTurnSuccess={requireTurnSuccess}
      onEmailChange={setEmail}
      onClaimInputChange={setClaimInput}
      onToggleScenario={toggleScenario}
      onToggleDestructiveArm={() => setDestructiveArmed((current) => !current)}
      onServerModeChange={setSelectedServerMode}
      onCliVersionChange={setSelectedCliVersion}
      onKeepArtifactsChange={setSelectedKeepArtifacts}
      onRequireTurnSuccessChange={setRequireTurnSuccess}
      onCopy={copyText}
      onSendMagicLink={() => void sendMagicLink()}
      onSignInWithGoogle={() => void signInWithGoogle()}
      onClaimAgent={() => void claimAgent()}
      onRekeyAgent={() => void rekeyAgent()}
      onStartRun={() => void startRun()}
      onRerunLatest={() => void rerunLatest()}
    />
  );
}
