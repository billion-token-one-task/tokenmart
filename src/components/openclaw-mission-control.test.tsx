import assert from "node:assert/strict";
import test from "node:test";
import type { ComponentProps } from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { OpenClawMissionControlView } from "./openclaw-mission-control";

type MissionControlProps = ComponentProps<typeof OpenClawMissionControlView>;

function createProps(
  overrides: Partial<MissionControlProps> = {},
): MissionControlProps {
  return {
    loggedIn: true,
    claimStatus: {
      agent_name: "Operator Fox",
      lifecycle_state: "connected_unclaimed",
      connected: true,
      last_heartbeat_at: "2026-03-09T10:05:00.000Z",
      pending_locked_rewards: 42,
      claimable: true,
      claim_url:
        "https://www.tokenmart.net/connect/openclaw?claim_code=claim-123",
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
      claim_url:
        "https://www.tokenmart.net/connect/openclaw?claim_code=claim-123",
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
      local_asset_path:
        "/Users/test/.openclaw/tokenbook-bridge/tokenbook-bridge.sh",
      last_manifest_version: "2026.3.7",
      last_manifest_checksum: "abc123",
      diagnostics: {
        bridge_installed: true,
        credentials_present: true,
        hooks_registered: true,
        cron_registered: true,
        runtime_reachable: true,
        pulse_recent: true,
        self_check_recent: true,
        challenge_fresh: true,
        manifest_drift: false,
        last_error: null,
      },
      capability_flags: {
        can_manage_treasury: false,
        can_transfer_credits: false,
        can_post_public: false,
        can_dm_agents: false,
        can_join_groups: false,
        can_follow_agents: false,
        can_claim_rewards: false,
        can_access_operator_surfaces: false,
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
        local_asset_path:
          "/Users/test/.openclaw/tokenbook-bridge/tokenbook-bridge.sh",
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
        current_assignments: [
          {
            title: "Forecast ridge",
            summary: "Produce a first-pass live forecast.",
          },
        ],
        mission_context: {
          mountains: [{ title: "Metaculus Spring AIB 2026 Forecast Engine" }],
        },
      },
    },
    injectorCommand:
      "curl -fsSL https://www.tokenmart.net/openclaw/inject.sh | bash",
    claiming: false,
    rekeying: false,
    onCopy() {},
    onClaimAgent() {},
    onRekeyAgent() {},
    ...overrides,
  };
}

test("mission control view shows a single injector-first onboarding path when logged out", () => {
  const html = renderToStaticMarkup(
    <OpenClawMissionControlView {...createProps({ loggedIn: false })} />,
  );

  assert.match(
    html,
    /Paste this into Terminal on the Mac where OpenClaw already lives\./,
  );
  assert.match(
    html,
    /curl -fsSL https:\/\/www\.tokenmart\.net\/openclaw\/inject\.sh \| bash/,
  );
  assert.match(html, /bg-\[#0a0a0a\] text-\[14px\] leading-7 text-white/);
  assert.match(html, /That is the whole onboarding flow/);
  assert.doesNotMatch(html, /Claim agent/);
  assert.doesNotMatch(html, /Rekey claimed agent/);
  assert.doesNotMatch(html, /sandbox/i);
  assert.doesNotMatch(html, /Wipe and reboot/);
});

test("mission control view shows monitoring and claim controls when signed in", () => {
  const html = renderToStaticMarkup(<OpenClawMissionControlView {...createProps()} />);

  assert.match(html, /BRIDGE MONITOR/);
  assert.match(html, /RUNTIME HEALTH/);
  assert.match(html, /Claim agent/);
  assert.match(html, /Rekey claimed agent/);
  assert.match(html, /Monitoring only/);
  assert.match(html, /Live bridge posture/);
  assert.doesNotMatch(html, /Wipe and reboot/);
  assert.doesNotMatch(html, /Local destructive control/);
  assert.doesNotMatch(html, /Launch selected run/);
  assert.doesNotMatch(html, /Scenario Bundle/);
  assert.doesNotMatch(html, /sandbox/i);
});
