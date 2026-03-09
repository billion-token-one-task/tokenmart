import assert from "node:assert/strict";
import test from "node:test";
import type { ComponentProps } from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { OpenClawMissionControlView } from "./openclaw-mission-control";

type MissionControlProps = ComponentProps<typeof OpenClawMissionControlView>;
type MissionControlSandbox = NonNullable<MissionControlProps["sandbox"]>;
type MissionControlRunRecord = NonNullable<MissionControlSandbox["latestRun"]>;

function createProps(overrides: Partial<MissionControlProps> = {}): MissionControlProps {
  const latestRun: MissionControlRunRecord = {
    runId: "run-123",
    status: "failed" as const,
    startedAt: "2026-03-09T10:00:00.000Z",
    finishedAt: "2026-03-09T10:05:00.000Z",
    selectedScenarios: [
      "fresh_install",
      "wipe_and_reinstall_same_fingerprint",
      "wipe_and_reinstall_new_fingerprint",
    ],
    serverMode: "spawn-dev" as const,
    cliVersion: "latest",
    keepArtifacts: "always" as const,
    requireTurnSuccess: false,
    steps: [
      {
        scenario: "fresh_install" as const,
        name: "run install.sh",
        ok: true,
        details: "downloaded installer and connected runtime",
      },
      {
        scenario: "wipe_and_reinstall_new_fingerprint" as const,
        name: "new fingerprint creates a distinct agent",
        ok: true,
        details: "agent-old -> agent-new",
      },
    ],
    identityTransitions: [
      {
        scenario: "wipe_and_reinstall_same_fingerprint" as const,
        previousAgentId: "agent-same",
        currentAgentId: "agent-same",
        reused: true,
      },
      {
        scenario: "wipe_and_reinstall_new_fingerprint" as const,
        previousAgentId: "agent-old",
        currentAgentId: "agent-new",
        reused: false,
        note: "The destructive rerun registered a new agent because the workspace fingerprint changed.",
      },
    ],
    artifacts: [
      {
        label: "installer",
        path: "/tmp/openclaw-suite/run-123/install.sh",
        kind: "installer",
        retained: true,
        scenario: "fresh_install" as const,
      },
    ],
    logs: [
      "[fresh_install] [pass] run install.sh",
      "[wipe_and_reinstall_new_fingerprint] [pass] new fingerprint creates a distinct agent",
    ],
    summary: "Latest destructive verification run.",
  };

  return {
    loggedIn: true,
    ready: true,
    email: "operator@example.com",
    claimInput: "claim-123",
    claimCode: "claim-123",
    claimStatus: {
      agent_name: "Operator Fox",
      lifecycle_state: "connected_unclaimed",
      connected: true,
      last_heartbeat_at: "2026-03-09T10:05:00.000Z",
      pending_locked_rewards: 42,
      claimable: true,
      claim_url: "https://www.tokenmart.net/connect/openclaw?claim_code=claim-123",
    },
    status: {
      connected: true,
      runtime_online: true,
      first_success_ready: true,
      last_heartbeat_at: "2026-03-09T10:05:00.000Z",
      runtime_mode: "bridge",
      skill_version: "2026.3.7",
      durable_identity_eligible: true,
      claim_required_for_rewards: true,
      pending_locked_rewards: 42,
      claim_url: "https://www.tokenmart.net/connect/openclaw?claim_code=claim-123",
      bridge_mode: "bridge",
      bridge_version: "2026.3.7",
      profile_name: "tm-fresh",
      workspace_path: "/tmp/workspace",
      openclaw_home: "/tmp/home/.openclaw",
      openclaw_version: "2026.3.7",
      last_attach_at: "2026-03-09T10:00:00.000Z",
      last_pulse_at: "2026-03-09T10:05:00.000Z",
      last_self_check_at: "2026-03-09T10:05:00.000Z",
      cron_health: "healthy",
      hook_health: "healthy",
      rekey_required: false,
      update_available: false,
      update_required: false,
      last_update_at: "2026-03-09T10:04:00.000Z",
      last_update_error: null,
      last_update_outcome: "checked",
      current_checksum: "abc123",
      local_asset_path: "/Users/test/.openclaw/tokenbook-bridge/tokenbook-bridge.sh",
      last_manifest_version: "2026.3.7",
      last_manifest_checksum: "abc123",
      diagnostics: {
        bridge_installed: true,
        credentials_present: true,
        hooks_registered: true,
        cron_registered: true,
        runtime_reachable: true,
        last_error: null,
      },
      capability_flags: {
        can_manage_treasury: true,
        can_transfer_credits: true,
        can_post_public: true,
        can_dm_agents: true,
        can_join_groups: true,
        can_follow_agents: true,
        can_claim_rewards: true,
        can_access_operator_surfaces: true,
      },
      bridge: {
        bridge_mode: "bridge",
        bridge_version: "2026.3.7",
        profile_name: "tm-fresh",
        workspace_path: "/tmp/workspace",
        openclaw_home: "/tmp/home/.openclaw",
        openclaw_version: "2026.3.7",
        last_attach_at: "2026-03-09T10:00:00.000Z",
        last_pulse_at: "2026-03-09T10:05:00.000Z",
        last_self_check_at: "2026-03-09T10:05:00.000Z",
        cron_health: "healthy",
        hook_health: "healthy",
        runtime_online: true,
        rekey_required: false,
        update_available: false,
        update_required: false,
        last_update_at: "2026-03-09T10:04:00.000Z",
        last_update_error: null,
        last_update_outcome: "checked",
        current_checksum: "abc123",
        local_asset_path: "/Users/test/.openclaw/tokenbook-bridge/tokenbook-bridge.sh",
        last_manifest_version: "2026.3.7",
        last_manifest_checksum: "abc123",
      },
      agent: {
        id: "agent-123",
        name: "Operator Fox",
        lifecycle_state: "connected_unclaimed",
        connected_at: "2026-03-09T10:00:00.000Z",
        claimed_at: null,
      },
      install_validator: {
        api_key_present: true,
        heartbeat_recent: true,
        runtime_mode_detected: true,
        challenge_capable: true,
        skill_current: true,
      },
      runtime_preview: {
        current_assignments: [{ title: "Forecast ridge", summary: "Produce a first-pass live forecast." }],
        mission_context: { mountains: [{ title: "Metaculus Spring AIB 2026 Forecast Engine" }] },
      },
    },
    sandbox: {
      capabilities: {
        isLocalEnvironment: false,
        canRunDestructive: false,
        canViewArtifacts: true,
        strictTurnAvailable: false,
        canRunScenarios: false,
        disabledReason: "Remote environments are monitoring-only for destructive sandbox control.",
      },
      defaults: {
        baseUrl: "http://127.0.0.1:3000",
        cliVersion: "latest",
        serverMode: "auto",
        keepArtifacts: "fail",
        requireTurnSuccess: false,
      },
      cache: {
        root: "/tmp/openclaw-cache",
        availableVersions: ["latest", "2026.3.7"],
      },
      latestRun,
      currentRun: null,
      runs: [latestRun],
    },
    injectorCommand: "curl -fsSL https://www.tokenmart.net/openclaw/inject.sh | bash",
    signingIn: false,
    sendingLink: false,
    claiming: false,
    rekeying: false,
    launchingRun: false,
    destructiveArmed: false,
    selectedScenarios: ["fresh_install", "wipe_and_reinstall_new_fingerprint"] as const,
    selectedServerMode: "auto",
    selectedCliVersion: "latest",
    selectedKeepArtifacts: "fail",
    requireTurnSuccess: false,
    onEmailChange() {},
    onClaimInputChange() {},
    onToggleScenario() {},
    onToggleDestructiveArm() {},
    onServerModeChange() {},
    onCliVersionChange() {},
    onKeepArtifactsChange() {},
    onRequireTurnSuccessChange() {},
    onCopy() {},
    onSendMagicLink() {},
    onSignInWithGoogle() {},
    onClaimAgent() {},
    onRekeyAgent() {},
    onStartRun() {},
    onRerunLatest() {},
    ...overrides,
  };
}

test("mission control view explains read-only mode and renders identity continuity", () => {
  const html = renderToStaticMarkup(<OpenClawMissionControlView {...createProps()} />);

  assert.match(html, /Remote environments are monitoring-only for destructive sandbox control/);
  assert.match(html, /Identity continuity/);
  assert.match(html, /agent-old -&gt; agent-new|agent-old.*agent-new/);
  assert.match(html, /new fingerprint creates a distinct agent/);
});

test("mission control view reflects local execution and strict-turn readiness", () => {
  const html = renderToStaticMarkup(
    <OpenClawMissionControlView
      {...createProps({
        sandbox: {
          capabilities: {
            isLocalEnvironment: true,
            canRunDestructive: true,
            canViewArtifacts: true,
            strictTurnAvailable: true,
            canRunScenarios: true,
            disabledReason: null,
          },
          defaults: {
            baseUrl: "http://127.0.0.1:3000",
            cliVersion: "latest",
            serverMode: "auto",
            keepArtifacts: "fail",
            requireTurnSuccess: false,
          },
          cache: {
            root: "/tmp/openclaw-cache",
            availableVersions: ["latest"],
          },
          latestRun: null,
          currentRun: null,
          runs: [],
        },
        destructiveArmed: true,
        selectedScenarios: ["fresh_install", "strict_provider_turn"] as const,
        requireTurnSuccess: true,
      })}
    />,
  );

  assert.match(html, /Launch selected run/);
  assert.match(html, /Strict provider turns need model provider credentials on this machine|Require a successful provider-backed model turn/);
  assert.doesNotMatch(html, /Remote environments are monitoring-only for destructive sandbox control/);
});
