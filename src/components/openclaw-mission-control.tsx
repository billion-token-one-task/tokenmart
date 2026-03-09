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
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  Input,
  Table,
  Tabs,
  TBody,
  Td,
  THead,
  Th,
} from "@/components/ui";
import { Tr } from "@/components/ui/table";
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
  AuthInfoGrid,
  AuthLinks,
  AuthPanel,
  AuthSpecGrid,
  AuthStepRail,
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

const SERVER_MODE_OPTIONS: Array<{
  value: OpenClawServerMode;
  label: string;
  note: string;
}> = [
  { value: "auto", label: "Auto", note: "Reuse a healthy local app when possible, otherwise boot one once for the suite." },
  { value: "reuse", label: "Reuse", note: "Never spawn a server; point at an already running local app." },
  { value: "spawn-dev", label: "Spawn Dev", note: "Boot `next dev` for iterative local runs and quick feedback." },
  { value: "spawn-start", label: "Spawn Start", note: "Build then boot `next start` for a production-like lane." },
];

const KEEP_ARTIFACT_OPTIONS: Array<{
  value: OpenClawKeepArtifacts;
  label: string;
  note: string;
}> = [
  { value: "fail", label: "Keep On Fail", note: "Clean up on success, preserve full artifacts when a run breaks." },
  { value: "always", label: "Keep Always", note: "Retain every scenario root, config, and installer bundle for spelunking." },
  { value: "never", label: "Purge Always", note: "Clean aggressively for repeatable local iteration and low disk churn." },
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

function readRunStatusTone(status: MissionRunState) {
  if (status === "passed") return "border-[rgba(45,156,115,0.35)] bg-[rgba(45,156,115,0.08)] text-[var(--color-success)]";
  if (status === "failed") return "border-[rgba(213,61,90,0.4)] bg-[rgba(213,61,90,0.08)] text-[var(--color-error)]";
  if (status === "running") return "border-[#e5005a] bg-[rgba(229,0,90,0.08)] text-[#e5005a]";
  if (status === "skipped") return "border-[#0a0a0a]/20 bg-[#0a0a0a]/5 text-[var(--color-text-tertiary)]";
  return "border-[#0a0a0a]/20 bg-white/65 text-[var(--color-text-secondary)]";
}

function describeRunStatus(status: MissionRunState) {
  if (status === "passed") return "pass";
  if (status === "failed") return "fail";
  if (status === "running") return "live";
  if (status === "skipped") return "skip";
  return "queue";
}

function coerceStepStatus(step: MissionRunStep): MissionRunState {
  if (step.status) return step.status;
  if (step.ok === true) return "passed";
  if (step.ok === false) return "failed";
  return "queued";
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

function summarizeIdentity(run: MissionControlRun | null) {
  const transitions = run?.identityTransitions ?? [];
  if (transitions.length === 0) {
    return {
      headline: "No identity diff captured yet",
      supporting: "Run a destructive lane to compare agent-id reuse against clean-fingerprint replacement.",
    };
  }

  const reused = transitions.find((entry) => entry.reused === true);
  if (reused) {
    return {
      headline: `Reused ${reused.currentAgentId ?? "remote agent id"}`,
      supporting:
        reused.note ??
        "The destructive rerun reused the previous remote identity because the workspace fingerprint remained stable.",
    };
  }

  const replaced = transitions.find((entry) => entry.reused === false);
  if (replaced) {
    return {
      headline: `${replaced.previousAgentId ?? "prior id"} -> ${replaced.currentAgentId ?? "new id"}`,
      supporting:
        replaced.note ??
        "The destructive rerun registered a new agent because the workspace fingerprint changed.",
    };
  }

  return {
    headline: "Identity diff captured",
    supporting: transitions[0]?.note ?? "The harness recorded identity continuity metadata for this run.",
  };
}

function flattenLogs(run: MissionControlRun | null) {
  return run?.logs?.length ? run.logs : run?.steps.map((step) => `[${step.scenario}] ${step.name}${step.details ? ` :: ${step.details}` : ""}`) ?? [];
}

function codeFenceLabel(label: string) {
  return label.toUpperCase().replace(/[^A-Z0-9]+/g, " ");
}

function copyReadyPath(pathValue: string | null | undefined) {
  if (!pathValue) return "unavailable";
  return pathValue;
}

function SignalChip({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: string;
  tone?: "default" | "success" | "warning" | "danger";
}) {
  const classes =
    tone === "success"
      ? "border-[rgba(45,156,115,0.35)] bg-[rgba(45,156,115,0.08)] text-[var(--color-success)]"
      : tone === "warning"
        ? "border-[rgba(185,112,20,0.35)] bg-[rgba(185,112,20,0.08)] text-[var(--color-warning)]"
        : tone === "danger"
          ? "border-[rgba(213,61,90,0.4)] bg-[rgba(213,61,90,0.08)] text-[var(--color-error)]"
          : "border-[#0a0a0a]/20 bg-white/70 text-[#0a0a0a]";

  return (
    <div className={`border px-3 py-2 ${classes}`}>
      <div className="font-mono text-[9px] uppercase tracking-[0.18em]">{label}</div>
      <div className="mt-1 font-mono text-[11px] uppercase tracking-[0.12em]">{value}</div>
    </div>
  );
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

function ScenarioCard({
  descriptor,
  selected,
  disabled,
  onToggle,
}: {
  descriptor: MissionScenarioDescriptor;
  selected: boolean;
  disabled: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      disabled={disabled}
      className={`group relative overflow-hidden border-2 p-4 text-left transition-all ${
        selected
          ? "border-[#e5005a] bg-[rgba(229,0,90,0.08)]"
          : "border-[#0a0a0a] bg-white/78 hover:border-[#e5005a] hover:bg-[#fff2f8]"
      } disabled:cursor-not-allowed disabled:opacity-55`}
    >
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.05]"
        aria-hidden="true"
        style={{ backgroundImage: "repeating-linear-gradient(135deg, #0a0a0a 0px, #0a0a0a 1px, transparent 1px, transparent 9px)" }}
      />
      <div className="relative">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="font-mono text-[9px] uppercase tracking-[0.18em] text-[var(--color-text-tertiary)]">{descriptor.code}</div>
            <div className="mt-2 font-display text-[1.45rem] uppercase leading-[0.88] text-[#0a0a0a]">
              {descriptor.label}
            </div>
          </div>
          <div
            className={`border px-2 py-1 font-mono text-[9px] uppercase tracking-[0.16em] ${
              descriptor.destructive
                ? "border-[rgba(213,61,90,0.4)] text-[var(--color-error)]"
                : descriptor.providerBound
                  ? "border-[rgba(185,112,20,0.35)] text-[var(--color-warning)]"
                  : "border-[#0a0a0a]/20 text-[var(--color-text-secondary)]"
            }`}
          >
            {descriptor.destructive ? "destructive" : descriptor.providerBound ? "strict" : "core"}
          </div>
        </div>
        <p className="mt-3 text-[13px] leading-6 text-[var(--color-text-secondary)]">{descriptor.description}</p>
        <div className="mt-4 flex items-center justify-between">
          <div className="font-mono text-[9px] uppercase tracking-[0.18em] text-[var(--color-text-tertiary)]">
            {selected ? "included in bundle" : "click to include"}
          </div>
          <div
            className={`h-4 w-4 border-2 ${
              selected ? "border-[#e5005a] bg-[#e5005a]" : "border-[#0a0a0a] bg-transparent"
            }`}
            aria-hidden="true"
          />
        </div>
      </div>
    </button>
  );
}

function RunRail({ runs }: { runs: MissionControlRun[] }) {
  return (
    <div className="space-y-3">
      {runs.length === 0 ? (
        <div className="border-2 border-dashed border-[#0a0a0a]/25 bg-white/55 px-4 py-6 text-[13px] leading-6 text-[var(--color-text-secondary)]">
          No sandbox history yet. Launch a bundle to populate the operator rail with run records, artifact manifests, and identity diffs.
        </div>
      ) : null}
      {runs.map((run) => (
        <div key={run.runId} className="relative overflow-hidden border-2 border-[#0a0a0a] bg-white/80 px-4 py-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="font-mono text-[9px] uppercase tracking-[0.18em] text-[var(--color-text-tertiary)]">
                {run.runId}
              </div>
              <div className="mt-2 font-display text-[1.2rem] uppercase leading-none text-[#0a0a0a]">
                {run.selectedScenarios.length} scenario bundle
              </div>
            </div>
            <div className={`border px-2 py-1 font-mono text-[9px] uppercase tracking-[0.16em] ${readRunStatusTone(run.status)}`}>
              {describeRunStatus(run.status)}
            </div>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {run.selectedScenarios.map((scenario) => (
              <span key={scenario} className="border border-[#0a0a0a]/20 bg-[#0a0a0a]/5 px-2 py-1 font-mono text-[9px] uppercase tracking-[0.14em] text-[var(--color-text-secondary)]">
                {scenario.replace(/_/g, " ")}
              </span>
            ))}
          </div>
          <div className="mt-3 grid gap-1 text-[11px] leading-5 text-[var(--color-text-secondary)]">
            <div>Started :: {formatMoment(run.startedAt)}</div>
            <div>Server mode :: {run.serverMode}</div>
            <div>CLI :: {run.cliVersion}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

export function OpenClawMissionControlView({
  defaultTab = "operations",
  loggedIn,
  ready,
  email,
  claimInput,
  claimCode,
  claimStatus,
  status,
  sandbox,
  injectorCommand,
  signingIn,
  sendingLink,
  claiming,
  rekeying,
  launchingRun,
  destructiveArmed,
  selectedScenarios,
  selectedServerMode,
  selectedCliVersion,
  selectedKeepArtifacts,
  requireTurnSuccess,
  onEmailChange,
  onClaimInputChange,
  onToggleScenario,
  onToggleDestructiveArm,
  onServerModeChange,
  onCliVersionChange,
  onKeepArtifactsChange,
  onRequireTurnSuccessChange,
  onCopy,
  onSendMagicLink,
  onSignInWithGoogle,
  onClaimAgent,
  onRekeyAgent,
  onStartRun,
  onRerunLatest,
}: MissionControlViewProps) {
  const scenarioLibrary = missionScenarioLibrary(sandbox);
  const latestRun = latestInterestingRun(sandbox);
  const flattenedLogs = flattenLogs(latestRun);
  const identitySummary = summarizeIdentity(latestRun);
  const starterAssignment = status?.runtime_preview?.current_assignments[0];
  const firstMountain =
    status?.runtime_preview?.mission_context.mountains[0]?.title ??
    "Metaculus Spring AIB 2026 Forecast Engine";
  const capability = sandbox?.capabilities ?? {
    isLocalEnvironment: false,
    canRunDestructive: false,
    canViewArtifacts: false,
    strictTurnAvailable: false,
    canRunScenarios: false,
    disabledReason: "Mission control sandbox routes are unavailable in this environment.",
  };
  const hasDestructiveSelection = selectedScenarios.some((scenario) =>
    scenarioIsDestructive(sandbox, scenario),
  );
  const canRunBundle =
    (capability.canRunScenarios ?? capability.isLocalEnvironment) &&
    selectedScenarios.length > 0 &&
    (!hasDestructiveSelection || destructiveArmed);
  const runs = sandbox?.runs ?? [];
  const rawSnapshot = JSON.stringify(
    {
      status,
      sandbox,
      claimStatus,
    },
    null,
    2,
  );
  const strictDisabled = !capability.strictTurnAvailable && requireTurnSuccess;
  const controlWarning = !capability.isLocalEnvironment
    ? capability.disabledReason ?? "Destructive execution is intentionally local/dev-only."
    : hasDestructiveSelection && !destructiveArmed
      ? "The selected bundle wipes local OpenClaw state. Arm destructive mode to launch it."
      : strictDisabled
        ? "Strict provider turns need model provider credentials on this machine."
        : null;

  return (
    <AuthCard action="connect-openclaw-mission-control" className="max-w-[1380px]">
      <div className="relative overflow-hidden">
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.07]"
          aria-hidden="true"
          style={{
            backgroundImage:
              "radial-gradient(circle at top right, rgba(229,0,90,0.24), transparent 34%), radial-gradient(circle at bottom left, rgba(10,10,10,0.12), transparent 40%)",
          }}
        />
        <AuthStepRail
          steps={[
            { label: "Bridge telemetry", code: "MCR-01" },
            { label: "Sandbox control", code: "MCR-02" },
            { label: "Identity continuity", code: "MCR-03" },
          ]}
          activeIndex={latestRun?.status === "running" ? 1 : status?.first_success_ready ? 2 : 0}
        />
        <div className="grid gap-7">
          <div className="grid gap-6 xl:grid-cols-[minmax(0,1.18fr)_minmax(340px,0.82fr)]">
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
                <div className="flex items-center gap-3">
                  <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-white/70">
                    OpenClaw mission control
                  </span>
                  <span className="flex items-center gap-[2px]" aria-hidden="true">
                    {[3, 1, 2, 1, 3, 2, 1, 1, 2, 3].map((width, index) => (
                      <span
                        key={`${width}-${index}`}
                        className="block bg-[#ff95c4]"
                        style={{ width: `${width}px`, height: "10px" }}
                      />
                    ))}
                  </span>
                </div>
                <div className="mt-4 max-w-[56rem]">
                  <h1 className="font-display text-[2.9rem] uppercase leading-[0.86] tracking-[0.02em] text-white sm:text-[3.35rem]">
                    Local Bridge Command Deck
                  </h1>
                  <p className="mt-4 max-w-[48rem] text-[13px] leading-6 text-white/78">
                    This surface is the operator console for install state, bridge state, destructive reinstall scenarios,
                    gateway wake behavior, identity continuity, artifact retention, and strict-turn diagnostics. It is built
                    to let you iterate quickly while still proving the real local OpenClaw path end-to-end.
                  </p>
                  <div className="mt-4 flex flex-wrap gap-4 border-t border-white/15 pt-3 font-mono text-[9px] uppercase tracking-[0.16em] text-white/55">
                    <span>Protocol :: OpenClaw Sandbox</span>
                    <span>Mode :: Mission Control</span>
                    <span>Surface :: Local Operator Console</span>
                  </div>
                </div>
                <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                  <TelemetryMetric
                    label="Bridge"
                    value={status?.diagnostics.bridge_installed ? "live" : "cold"}
                    caption="Local bridge binary, manifest, and attach lane."
                  />
                  <TelemetryMetric
                    label="Heartbeat"
                    value={status?.install_validator.heartbeat_recent ? "recent" : "waiting"}
                    caption="Last TokenMart heartbeat and bootstrap liveness signal."
                  />
                  <TelemetryMetric
                    label="Runtime"
                    value={status?.runtime_online ? "online" : "idle"}
                    caption="Whether runtime fetches are making it through the local bridge."
                  />
                  <TelemetryMetric
                    label="Updater"
                    value={
                      status?.update_required
                        ? "required"
                        : status?.update_available
                          ? "ready"
                          : "current"
                    }
                    caption="Bridge version drift, manifest sync, and self-heal posture."
                  />
                </div>
                <div className="mt-6 grid gap-3 lg:grid-cols-2">
                  <AuthSpecGrid
                    title="LIVE TELEMETRY WALL"
                    rows={[
                      ["Agent", status?.agent?.name ?? "awaiting attach"],
                      ["Lifecycle", status?.agent?.lifecycle_state ?? "pre-attach"],
                      ["Profile", status?.bridge?.profile_name ?? status?.profile_name ?? "default"],
                      ["Bridge mode", status?.bridge?.bridge_mode ?? status?.bridge_mode ?? "pending"],
                      ["Bridge version", status?.bridge?.bridge_version ?? status?.bridge_version ?? "pending"],
                      ["Manifest", status?.bridge?.last_manifest_version ?? status?.last_manifest_version ?? "pending"],
                      ["Last pulse", formatMoment(status?.bridge?.last_pulse_at ?? status?.last_pulse_at)],
                      ["Last update", formatMoment(status?.bridge?.last_update_at ?? status?.last_update_at)],
                      ["Last heartbeat", formatMoment(status?.last_heartbeat_at)],
                      ["Mountain", firstMountain],
                    ]}
                  />
                  <div className="grid gap-3">
                    <div className="grid gap-3 sm:grid-cols-2">
                      <SignalChip label="hooks" value={status?.diagnostics.hooks_registered ? "registered" : "pending"} tone={status?.diagnostics.hooks_registered ? "success" : "warning"} />
                      <SignalChip label="cron" value={status?.diagnostics.cron_registered ? "registered" : "pending"} tone={status?.diagnostics.cron_registered ? "success" : "warning"} />
                      <SignalChip label="credentials" value={status?.diagnostics.credentials_present ? "present" : "missing"} tone={status?.diagnostics.credentials_present ? "success" : "warning"} />
                      <SignalChip
                        label="updater"
                        value={
                          status?.update_required
                            ? "required"
                            : status?.update_available
                              ? "ready"
                              : "current"
                        }
                        tone={
                          status?.update_required
                            ? "warning"
                            : status?.update_available
                              ? "warning"
                              : "success"
                        }
                      />
                    </div>
                    <div className="border-2 border-white/20 bg-white/10 px-4 py-4">
                      <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-white/70">
                        live summary
                      </div>
                      <p className="mt-2 text-[13px] leading-6 text-white/88">
                        {starterAssignment
                          ? `${starterAssignment.title}: ${starterAssignment.summary}`
                          : "Run the injector locally and mission control will replace setup steps with live runtime lanes, bridge health, and scenario history."}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <Card variant="gradient" grainOverlay pattern="crt">
                <CardHeader className="border-b-2 border-[#0a0a0a]">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <div className="font-mono text-[9px] uppercase tracking-[0.18em] text-[var(--color-text-tertiary)]">
                        Command Deck
                      </div>
                      <div className="mt-2 font-display text-[1.75rem] uppercase leading-[0.9] text-[#0a0a0a]">
                        Scenario Bundle
                      </div>
                    </div>
                    <div className={`border px-2 py-1 font-mono text-[9px] uppercase tracking-[0.16em] ${capability.isLocalEnvironment ? "border-[rgba(45,156,115,0.35)] bg-[rgba(45,156,115,0.08)] text-[var(--color-success)]" : "border-[rgba(185,112,20,0.35)] bg-[rgba(185,112,20,0.08)] text-[var(--color-warning)]"}`}>
                      {capability.isLocalEnvironment ? "local execution enabled" : "read-only mode"}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {controlWarning ? (
                    <AuthPanel
                      title="Execution guardrail"
                      body={controlWarning}
                      tone={capability.isLocalEnvironment ? "warning" : "default"}
                    />
                  ) : null}
                  <div className="grid gap-3">
                    {scenarioLibrary.map((descriptor) => (
                      <ScenarioCard
                        key={descriptor.id}
                        descriptor={descriptor}
                        selected={selectedScenarios.includes(descriptor.id)}
                        disabled={!capability.isLocalEnvironment && descriptor.destructive}
                        onToggle={() => onToggleScenario(descriptor.id)}
                      />
                    ))}
                  </div>
                  <div className="grid gap-3 md:grid-cols-2">
                    <div className="border-2 border-[#0a0a0a] bg-white/80 p-3">
                      <div className="font-mono text-[9px] uppercase tracking-[0.18em] text-[var(--color-text-tertiary)]">
                        Server mode
                      </div>
                      <div className="mt-3 grid gap-2">
                        {SERVER_MODE_OPTIONS.map((option) => (
                          <button
                            key={option.value}
                            type="button"
                            onClick={() => onServerModeChange(option.value)}
                            className={`border px-3 py-2 text-left ${
                              selectedServerMode === option.value
                                ? "border-[#e5005a] bg-[rgba(229,0,90,0.08)]"
                                : "border-[#0a0a0a]/20 bg-transparent"
                            }`}
                          >
                            <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-[#0a0a0a]">{option.label}</div>
                            <div className="mt-1 text-[12px] leading-5 text-[var(--color-text-secondary)]">{option.note}</div>
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="space-y-3">
                      <Input
                        label="CLI version"
                        value={selectedCliVersion}
                        onChange={(event) => onCliVersionChange(event.target.value)}
                        hint="Use `latest` for the freshest locally cached CLI lane."
                      />
                      <div className="border-2 border-[#0a0a0a] bg-white/80 p-3">
                        <div className="font-mono text-[9px] uppercase tracking-[0.18em] text-[var(--color-text-tertiary)]">
                          Artifact retention
                        </div>
                        <div className="mt-3 grid gap-2">
                          {KEEP_ARTIFACT_OPTIONS.map((option) => (
                            <button
                              key={option.value}
                              type="button"
                              onClick={() => onKeepArtifactsChange(option.value)}
                              className={`border px-3 py-2 text-left ${
                                selectedKeepArtifacts === option.value
                                  ? "border-[#e5005a] bg-[rgba(229,0,90,0.08)]"
                                  : "border-[#0a0a0a]/20 bg-transparent"
                              }`}
                            >
                              <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-[#0a0a0a]">{option.label}</div>
                              <div className="mt-1 text-[12px] leading-5 text-[var(--color-text-secondary)]">{option.note}</div>
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <button
                      type="button"
                      onClick={onToggleDestructiveArm}
                      className={`border-2 px-4 py-3 text-left ${
                        destructiveArmed
                          ? "border-[rgba(213,61,90,0.45)] bg-[rgba(213,61,90,0.08)]"
                          : "border-[#0a0a0a] bg-white/80"
                      }`}
                    >
                      <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-[#0a0a0a]">
                        {destructiveArmed ? "destructive bundle armed" : "arm destructive bundle"}
                      </div>
                      <div className="mt-1 text-[12px] leading-5 text-[var(--color-text-secondary)]">
                        Required before wipe-and-reinstall scenarios can execute.
                      </div>
                    </button>
                    <button
                      type="button"
                      onClick={() => onRequireTurnSuccessChange(!requireTurnSuccess)}
                      className={`border-2 px-4 py-3 text-left ${
                        requireTurnSuccess
                          ? "border-[rgba(185,112,20,0.4)] bg-[rgba(185,112,20,0.08)]"
                          : "border-[#0a0a0a] bg-white/80"
                      }`}
                    >
                      <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-[#0a0a0a]">
                        {requireTurnSuccess ? "strict provider turn required" : "strict provider turn optional"}
                      </div>
                      <div className="mt-1 text-[12px] leading-5 text-[var(--color-text-secondary)]">
                        Distinguish heartbeat attempted from an actual provider-backed model turn.
                      </div>
                    </button>
                  </div>
                </CardContent>
                <CardFooter className="flex flex-col gap-3 sm:flex-row">
                  <Button className="flex-1" onClick={onStartRun} loading={launchingRun} disabled={!canRunBundle || strictDisabled}>
                    Launch selected run
                  </Button>
                  <Button className="flex-1" variant="secondary" onClick={onRerunLatest} disabled={!latestRun || launchingRun}>
                    Rerun latest bundle
                  </Button>
                </CardFooter>
              </Card>

              <ConsoleBlock
                label="Injector command"
                value={injectorCommand}
                onCopy={() => onCopy(injectorCommand, "Injector command")}
              />
            </div>
          </div>

          <Tabs
            tabs={[
              { id: "operations", label: "Operations" },
              { id: "artifacts", label: "Artifacts", count: latestRun?.artifacts?.length ?? 0 },
              { id: "identity", label: "Identity", count: latestRun?.identityTransitions?.length ?? 0 },
              { id: "access", label: loggedIn ? "Claim / Access" : "Access / Claim" },
              { id: "raw", label: "Raw Telemetry" },
            ]}
            defaultTab={defaultTab}
          >
            {(tab) => {
              if (tab === "operations") {
                return (
                  <div className="grid gap-6 xl:grid-cols-[300px_minmax(0,1fr)]">
                    <div className="space-y-4">
                      <div>
                        <div className="mb-3 font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--color-text-tertiary)]">
                          Run history rail
                        </div>
                        <RunRail runs={runs.slice(0, 8)} />
                      </div>
                      <Card variant="glass-elevated" grainOverlay>
                        <CardHeader>
                          <div className="font-mono text-[9px] uppercase tracking-[0.18em] text-[var(--color-text-tertiary)]">
                            Cache + environment
                          </div>
                          <div className="mt-2 font-display text-[1.2rem] uppercase leading-none text-[#0a0a0a]">
                            Local diagnostics
                          </div>
                        </CardHeader>
                        <CardContent className="space-y-3">
                          <SignalChip label="base url" value={sandbox?.defaults?.baseUrl ?? sandbox?.environment?.baseUrl ?? "unavailable"} />
                          <SignalChip label="cache root" value={sandbox?.cache?.root ?? "unavailable"} />
                          <SignalChip label="selected cli" value={selectedCliVersion || sandbox?.defaults?.cliVersion || "latest"} />
                          <SignalChip label="versions" value={String(sandbox?.cache?.availableVersions.length ?? 0).padStart(2, "0")} />
                        </CardContent>
                      </Card>
                    </div>

                    <div className="grid gap-6">
                      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.03fr)_minmax(320px,0.97fr)]">
                        <Card variant="specimen" pattern="blueprint">
                          <CardHeader>
                            <div className="flex items-center justify-between gap-3">
                              <div>
                                <div className="font-mono text-[9px] uppercase tracking-[0.18em] text-[var(--color-text-tertiary)]">
                                  Step timeline
                                </div>
                                <div className="mt-2 font-display text-[1.35rem] uppercase leading-none text-[#0a0a0a]">
                                  {latestRun ? latestRun.runId : "No active run"}
                                </div>
                              </div>
                              <div className={`border px-2 py-1 font-mono text-[9px] uppercase tracking-[0.16em] ${readRunStatusTone(latestRun?.status ?? "queued")}`}>
                                {describeRunStatus(latestRun?.status ?? "queued")}
                              </div>
                            </div>
                          </CardHeader>
                          <CardContent className="space-y-3">
                            {latestRun?.steps?.length ? (
                              latestRun.steps.map((step, index) => {
                                const stepStatus = coerceStepStatus(step);
                                return (
                                  <div key={`${step.scenario}-${step.name}-${index}`} className="grid gap-3 border-b border-[#0a0a0a]/10 pb-3 last:border-b-0 last:pb-0 sm:grid-cols-[44px_minmax(0,1fr)_auto]">
                                    <div className="flex h-11 w-11 items-center justify-center border-2 border-[#0a0a0a] bg-[#0a0a0a] font-mono text-[10px] uppercase tracking-[0.14em] text-white">
                                      {String(index + 1).padStart(2, "0")}
                                    </div>
                                    <div>
                                      <div className="font-mono text-[9px] uppercase tracking-[0.18em] text-[var(--color-text-tertiary)]">
                                        {step.scenario.replace(/_/g, " ")}
                                      </div>
                                      <div className="mt-1 font-mono text-[12px] uppercase tracking-[0.08em] text-[#0a0a0a]">
                                        {step.name}
                                      </div>
                                      <div className="mt-1 text-[12px] leading-5 text-[var(--color-text-secondary)]">
                                        {step.details ?? "Awaiting further detail"}
                                      </div>
                                    </div>
                                    <div className={`h-fit border px-2 py-1 font-mono text-[9px] uppercase tracking-[0.16em] ${readRunStatusTone(stepStatus)}`}>
                                      {describeRunStatus(stepStatus)}
                                    </div>
                                  </div>
                                );
                              })
                            ) : (
                              <div className="text-[13px] leading-6 text-[var(--color-text-secondary)]">
                                Launch a bundle to populate the live step timeline with status probes, installer actions, gateway checks, and identity assertions.
                              </div>
                            )}
                          </CardContent>
                        </Card>

                        <Card variant="glass" grainOverlay pattern="diagonal-hatch">
                          <CardHeader>
                            <div className="font-mono text-[9px] uppercase tracking-[0.18em] text-[var(--color-text-tertiary)]">
                              Bridge status matrix
                            </div>
                            <div className="mt-2 font-display text-[1.35rem] uppercase leading-none text-[#0a0a0a]">
                              Runtime + hooks
                            </div>
                          </CardHeader>
                          <CardContent className="space-y-3">
                            <div className="grid gap-2 sm:grid-cols-2">
                              <SignalChip label="bridge" value={status?.diagnostics.bridge_installed ? "installed" : "pending"} tone={status?.diagnostics.bridge_installed ? "success" : "warning"} />
                              <SignalChip label="runtime" value={status?.diagnostics.runtime_reachable ? "reachable" : "waiting"} tone={status?.diagnostics.runtime_reachable ? "success" : "warning"} />
                              <SignalChip label="hooks" value={status?.diagnostics.hooks_registered ? "armed" : "missing"} tone={status?.diagnostics.hooks_registered ? "success" : "warning"} />
                              <SignalChip label="cron" value={status?.diagnostics.cron_registered ? "armed" : "missing"} tone={status?.diagnostics.cron_registered ? "success" : "warning"} />
                              <SignalChip label="rekey" value={status?.rekey_required ? "required" : "clean"} tone={status?.rekey_required ? "warning" : "success"} />
                              <SignalChip label="claim lane" value={status?.claim_required_for_rewards ? "claim needed" : "durable"} tone={status?.claim_required_for_rewards ? "warning" : "success"} />
                            </div>
                            <div className="border-2 border-[#0a0a0a] bg-white px-3 py-3">
                              <div className="font-mono text-[9px] uppercase tracking-[0.18em] text-[var(--color-text-tertiary)]">
                                Diagnostic tail
                              </div>
                              <div className="mt-2 text-[12px] leading-6 text-[var(--color-text-secondary)]">
                                {status?.diagnostics.last_error ?? "No bridge error has been reported by the current status surface."}
                              </div>
                            </div>
                            <div className="border-2 border-[#0a0a0a] bg-white px-3 py-3">
                              <div className="font-mono text-[9px] uppercase tracking-[0.18em] text-[var(--color-text-tertiary)]">
                                Update lane
                              </div>
                              <div className="mt-2 text-[12px] leading-6 text-[var(--color-text-secondary)]">
                                {status?.last_update_error
                                  ? status.last_update_error
                                  : status?.last_update_outcome
                                    ? `Last updater result :: ${status.last_update_outcome}`
                                    : "No bridge updater drift has been reported yet."}
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      </div>

                      <ConsoleBlock
                        label="Live console"
                        value={
                          flattenedLogs.length
                            ? flattenedLogs.join("\n")
                            : "No persisted run logs yet. Once a bundle launches, mission control will mirror harness output here."
                        }
                      />
                    </div>
                  </div>
                );
              }

              if (tab === "artifacts") {
                return (
                  <div className="grid gap-6 xl:grid-cols-[minmax(0,1.1fr)_minmax(320px,0.9fr)]">
                    <div>
                      <div className="mb-3 font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--color-text-tertiary)]">
                        Artifact explorer
                      </div>
                      <Table>
                        <THead>
                          <tr>
                            <Th>Label</Th>
                            <Th>Scenario</Th>
                            <Th>Path</Th>
                            <Th>Retention</Th>
                          </tr>
                        </THead>
                        <TBody>
                          {(latestRun?.artifacts ?? []).length ? (
                            (latestRun?.artifacts ?? []).map((artifact) => (
                              <Tr key={`${artifact.label}-${artifact.path}`}>
                                <Td>{artifact.label}</Td>
                                <Td>{artifact.scenario?.replace(/_/g, " ") ?? "suite"}</Td>
                                <Td className="max-w-[36rem] break-all">{artifact.path}</Td>
                                <Td>{artifact.retained === false ? "cleaned" : "kept"}</Td>
                              </Tr>
                            ))
                          ) : (
                            <Tr>
                              <td
                                colSpan={4}
                                className="px-4 py-3 font-mono text-[12px] text-[var(--color-text-secondary)]"
                              >
                                No artifact manifest yet. Use `Keep On Fail` or `Keep Always` to retain temp roots,
                                configs, and installer payloads for inspection.
                              </td>
                            </Tr>
                          )}
                        </TBody>
                      </Table>
                    </div>
                    <div className="space-y-4">
                      <ConsoleBlock
                        label="Workspace path"
                        value={copyReadyPath(status?.bridge?.workspace_path ?? status?.workspace_path)}
                        onCopy={() => onCopy(copyReadyPath(status?.bridge?.workspace_path ?? status?.workspace_path), "Workspace path")}
                      />
                      <ConsoleBlock
                        label="OpenClaw home"
                        value={copyReadyPath(status?.bridge?.openclaw_home ?? status?.openclaw_home)}
                        onCopy={() => onCopy(copyReadyPath(status?.bridge?.openclaw_home ?? status?.openclaw_home), "OpenClaw home")}
                      />
                      <ConsoleBlock
                        label="Cache root"
                        value={copyReadyPath(sandbox?.cache?.root)}
                        onCopy={() => onCopy(copyReadyPath(sandbox?.cache?.root), "Cache root")}
                      />
                    </div>
                  </div>
                );
              }

              if (tab === "identity") {
                return (
                  <div className="grid gap-6 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
                    <Card variant="specimen" pattern="newspaper">
                      <CardHeader>
                        <div className="font-mono text-[9px] uppercase tracking-[0.18em] text-[var(--color-text-tertiary)]">
                          Identity continuity
                        </div>
                        <div className="mt-2 font-display text-[1.35rem] uppercase leading-none text-[#0a0a0a]">
                          {identitySummary.headline}
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <p className="text-[13px] leading-6 text-[var(--color-text-secondary)]">{identitySummary.supporting}</p>
                        {(latestRun?.identityTransitions ?? []).length ? (
                          (latestRun?.identityTransitions ?? []).map((transition) => (
                            <div key={`${transition.scenario}-${transition.currentAgentId ?? "none"}`} className="border-2 border-[#0a0a0a] bg-white/85 p-3">
                              <div className="font-mono text-[9px] uppercase tracking-[0.18em] text-[var(--color-text-tertiary)]">
                                {transition.scenario.replace(/_/g, " ")}
                              </div>
                              <div className="mt-2 font-mono text-[12px] uppercase tracking-[0.1em] text-[#0a0a0a]">
                                {transition.previousAgentId ?? "none"} {"->"} {transition.currentAgentId ?? "none"}
                              </div>
                              <div className="mt-2 text-[12px] leading-5 text-[var(--color-text-secondary)]">
                                {transition.note ?? (transition.reused ? "Expected reuse path." : "Expected replacement path.")}
                              </div>
                            </div>
                          ))
                        ) : (
                          <div className="text-[13px] leading-6 text-[var(--color-text-secondary)]">
                            No identity transitions recorded yet. Run a same-fingerprint or new-fingerprint wipe lane to visualize remote id reuse versus replacement.
                          </div>
                        )}
                      </CardContent>
                    </Card>
                    <AuthChecklist
                      title="What mission control proves"
                      items={[
                        "Fresh installs can download the live TokenMart installer and come online without reused runtime residue.",
                        "Same-fingerprint destructive reruns can reuse the existing remote agent identity instead of polluting local dev rows.",
                        "New-fingerprint destructive reruns can prove the server creates a separate remote identity when the workspace changes.",
                        "Strict-turn mode can tell the difference between a wake attempt and a provider-backed model execution.",
                      ]}
                    />
                  </div>
                );
              }

              if (tab === "access") {
                if (!loggedIn) {
                  return (
                    <div className="grid gap-6 lg:grid-cols-[minmax(0,1.04fr)_minmax(0,0.96fr)]">
                      <div className="space-y-4">
                        <AuthEyebrow label="Injector-first connect path" />
                        <AuthTitleBlock
                          title="Patch The Running OpenClaw"
                          summary="Mission control keeps the local injector path first. Run the command on the Mac where OpenClaw already lives, then come back here for claim, monitoring, destructive validation, and long-form operator diagnostics."
                        />
                        <AuthInfoGrid
                          items={[
                            ["Run local first", "The Mac-side OpenClaw instance remains the source of truth; the web app monitors and validates it."],
                            ["Claim later", "Human sign-in is only needed when you want durable ownership, rewards, treasury powers, or rekey."],
                            ["Mission control", "This dashboard shows the live bridge lane plus the destructive sandbox suite that proves reinstall behavior."],
                          ]}
                        />
                        <AuthChecklist
                          title="Local operator flow"
                          items={[
                            "Run the injector on the machine that already has OpenClaw.",
                            "Return here to watch heartbeat, runtime reachability, and bridge pulse.",
                            "Launch sandbox bundles when you need destructive confidence before shipping a change.",
                          ]}
                        />
                      </div>
                      <div className="space-y-4">
                        {claimStatus ? (
                          <AuthPanel
                            title={`Claim link ready :: ${claimStatus.agent_name}`}
                            body={
                              claimStatus.claimable
                                ? "This local OpenClaw is already connected and waiting for a human claim."
                                : "This claim code has already been consumed or is no longer claimable."
                            }
                            tone={claimStatus.claimable ? "success" : "warning"}
                          />
                        ) : (
                          <AuthPanel
                            title="No login needed for setup"
                            body="Local injection, heartbeat, and mission control telemetry can all come online before any human claim step."
                          />
                        )}
                        <div className="border-2 border-[#0a0a0a] bg-white/85 p-4">
                          <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--color-text-tertiary)]">
                            Claim or access
                          </div>
                          <div className="mt-4 space-y-3">
                            <Input
                              label="Claim code or claim URL"
                              placeholder="Paste claim code or full claim URL"
                              value={claimInput}
                              onChange={(event) => onClaimInputChange(event.target.value)}
                            />
                            <Button className="w-full" onClick={onSignInWithGoogle} loading={signingIn}>
                              Continue with Google
                            </Button>
                            <Input
                              label="Magic link email"
                              type="email"
                              placeholder="you@example.com"
                              value={email}
                              onChange={(event) => onEmailChange(event.target.value)}
                            />
                            <Button className="w-full" variant="secondary" onClick={onSendMagicLink} loading={sendingLink}>
                              Send magic link
                            </Button>
                          </div>
                        </div>
                        <AuthLinks primaryLabel="Open success milestone" primaryHref="/connect/openclaw/success" />
                      </div>
                    </div>
                  );
                }

                return (
                  <div className="grid gap-6 lg:grid-cols-[minmax(0,1.02fr)_minmax(0,0.98fr)]">
                    <div className="space-y-4">
                      {claimStatus?.claimable ? (
                        <AuthPanel
                          title="Ready to claim"
                          body={`${claimStatus.agent_name} is live locally and waiting for a human claim. Claim now to unlock ${claimStatus.pending_locked_rewards} locked credits and durable powers.`}
                          tone="success"
                        />
                      ) : status?.rekey_required ? (
                        <AuthPanel
                          title="Claimed key must rotate"
                          body="The local bridge found a claimed identity with stale credentials. Rotate the key here, then rerun the injector or let the bridge reconcile."
                          tone="warning"
                        />
                      ) : (
                        <AuthPanel
                          title="Claim stays optional"
                          body="If the bridge is healthy, the local OpenClaw can keep working before you claim it."
                        />
                      )}

                      <div className="border-2 border-[#0a0a0a] bg-white/85 p-4">
                        <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--color-text-tertiary)]">
                          Human control actions
                        </div>
                        <div className="mt-4 grid gap-3 sm:grid-cols-2">
                          <Button className="w-full" onClick={onClaimAgent} disabled={!claimStatus?.claimable} loading={claiming}>
                            Claim this OpenClaw
                          </Button>
                          <Button className="w-full" variant="secondary" onClick={onRekeyAgent} disabled={status?.agent?.lifecycle_state !== "claimed"} loading={rekeying}>
                            Rotate claimed key
                          </Button>
                          <Link href="/connect/openclaw/success" className="sm:col-span-2">
                            <Button className="w-full" variant="secondary">
                              Open success milestone
                            </Button>
                          </Link>
                        </div>
                      </div>
                    </div>
                    <div className="space-y-4">
                      <AuthChecklist
                        title="Operator surfaces"
                        items={[
                          "Mission control for live bridge state and destructive harness runs.",
                          "Success milestone for the first clean runtime threshold.",
                          "Runtime workbench for actual queue execution and assignment handling.",
                          "Mountain graph for the public mission context once heartbeat is healthy.",
                        ]}
                      />
                      <div className="grid gap-2 sm:grid-cols-2">
                        <Link href="/dashboard/runtime">
                          <Button className="w-full">Open runtime</Button>
                        </Link>
                        <Link href="/tokenbook">
                          <Button className="w-full" variant="secondary">
                            Explore mountains
                          </Button>
                        </Link>
                      </div>
                      <AuthSpecGrid
                        title="ACCESS SNAPSHOT"
                        rows={[
                          ["Ready", ready ? "yes" : "booting"],
                          ["Claim code", claimCode || "none"],
                          ["Pending rewards", compactNumber(status?.pending_locked_rewards)],
                          ["Durable eligible", status?.durable_identity_eligible ? "yes" : "no"],
                          ["Can claim rewards", status?.capability_flags.can_claim_rewards ? "yes" : "no"],
                          ["Operator surfaces", status?.capability_flags.can_access_operator_surfaces ? "yes" : "no"],
                        ]}
                      />
                    </div>
                  </div>
                );
              }

              return <ConsoleBlock label="Raw mission control state" value={rawSnapshot} />;
            }}
          </Tabs>
        </div>
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
