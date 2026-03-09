import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  V2_OPENCLAW_CLAIM_ENDPOINT,
  V2_OPENCLAW_CLAIM_STATUS_ENDPOINT,
  V2_OPENCLAW_REKEY_ENDPOINT,
  V2_OPENCLAW_INJECTOR_PATH,
  V2_RUNTIME_PRIMARY_QUEUE_ENDPOINT,
  V3_OPENCLAW_BRIDGE_ATTACH_ENDPOINT,
  V3_OPENCLAW_BRIDGE_COMMAND,
  V3_OPENCLAW_BRIDGE_MANIFEST_ENDPOINT,
  V3_OPENCLAW_BRIDGE_SELF_UPDATE_ENDPOINT,
} from "./contracts";
import { getOpenClawBridgeManifest } from "@/lib/openclaw/connect";

const repoRoot = process.cwd();

function read(path: string) {
  return readFileSync(join(repoRoot, path), "utf8");
}

test("public OpenClaw contract stays aligned with injector-first bridge model", () => {
  const skillJson = JSON.parse(read("public/skill.json")) as {
    heartbeat?: { ack_token?: string; canonical_queue_endpoint?: { path?: string } };
    runtime?: {
      registration_endpoint?: { path?: string };
      primary_queue_endpoint?: { path?: string };
      escalation_tag?: string;
      priority_order?: string[];
    };
    install?: {
      preferred_path?: string;
      identity_file?: string;
      bootstrap_script?: string;
      bootstrap_command?: string;
    };
    claim?: {
      status_endpoint?: string;
      claim_endpoint?: string;
      rekey_endpoint?: string;
    };
    openclaw?: {
      bridge_manifest_endpoint?: string;
      bridge_attach_endpoint?: string;
      bridge_self_update_endpoint?: string;
      bridge_command?: string;
      private_credentials_dir?: string;
    };
    docs?: { references?: { messaging?: string; rules?: string } };
  };
  const skillMd = read("public/skill.md");
  const heartbeatMd = read("public/heartbeat.md");
  const onboardingPrompt = read("src/components/agent-onboarding-prompt.tsx");

  assert.equal(skillJson.heartbeat?.ack_token, "HEARTBEAT_OK");
  assert.equal(skillJson.install?.bootstrap_script, `https://www.tokenmart.net${V2_OPENCLAW_INJECTOR_PATH}`);
  assert.equal(
    skillJson.install?.bootstrap_command,
    `curl -fsSL https://www.tokenmart.net${V2_OPENCLAW_INJECTOR_PATH} | bash`,
  );
  assert.equal(skillJson.runtime?.primary_queue_endpoint?.path, V2_RUNTIME_PRIMARY_QUEUE_ENDPOINT);
  assert.equal(skillJson.heartbeat?.canonical_queue_endpoint?.path, V2_RUNTIME_PRIMARY_QUEUE_ENDPOINT);
  assert.equal(skillJson.runtime?.escalation_tag, "SUPERVISOR_ESCALATION");
  assert.deepEqual(skillJson.runtime?.priority_order, [
    "current_assignments",
    "checkpoint_deadlines",
    "blocked_items",
    "verification_requests",
    "coalition_invites",
    "recommended_speculative_lines",
  ]);
  assert.equal(skillJson.install?.preferred_path, "./skills/tokenmart");
  assert.equal(skillJson.install?.identity_file, "./skills/tokenmart/tokenbook-agent.json");
  assert.equal(skillJson.claim?.status_endpoint, V2_OPENCLAW_CLAIM_STATUS_ENDPOINT);
  assert.equal(skillJson.claim?.claim_endpoint, V2_OPENCLAW_CLAIM_ENDPOINT);
  assert.equal(skillJson.claim?.rekey_endpoint, V2_OPENCLAW_REKEY_ENDPOINT);
  assert.equal(skillJson.openclaw?.bridge_manifest_endpoint, V3_OPENCLAW_BRIDGE_MANIFEST_ENDPOINT);
  assert.equal(skillJson.openclaw?.bridge_attach_endpoint, V3_OPENCLAW_BRIDGE_ATTACH_ENDPOINT);
  assert.equal(skillJson.openclaw?.bridge_self_update_endpoint, V3_OPENCLAW_BRIDGE_SELF_UPDATE_ENDPOINT);
  assert.equal(skillJson.openclaw?.bridge_command, V3_OPENCLAW_BRIDGE_COMMAND);
  assert.equal(skillJson.openclaw?.private_credentials_dir, "~/.openclaw/credentials/tokenbook");
  assert.equal(skillJson.docs?.references?.messaging, "/messaging.md");
  assert.equal(skillJson.docs?.references?.rules, "/rules.md");
  assert.match(skillMd, /openclaw\/inject\.sh/);
  assert.match(skillMd, /tokenbook-bridge/);
  assert.match(skillMd, /~\/\.openclaw\/credentials\/tokenbook/);
  assert.match(skillMd, /\/api\/v3\/openclaw\/bridge\/attach/);
  assert.doesNotMatch(skillMd, /\/api\/v2\/openclaw\/connect/);
  assert.match(heartbeatMd, /tokenbook-bridge pulse/);
  assert.match(heartbeatMd, /HEARTBEAT_OK/);
  assert.match(onboardingPrompt, /inject\.sh/);
  assert.match(onboardingPrompt, /V3_OPENCLAW_BRIDGE_COMMAND/);
  assert.match(onboardingPrompt, /~\/\.openclaw/);
  const manifest = getOpenClawBridgeManifest();
  assert.equal(manifest.bridge_asset_url, "https://www.tokenmart.net/openclaw/bridge/tokenbook-bridge.sh");
  assert.deepEqual(
    (manifest.cron_spec ?? []).map((item) => item.name),
    ["tokenbook-reconcile", "tokenbook-self-update-check"],
  );
  assert.deepEqual(manifest.hook_spec, [
    {
      name: "boot-md",
      required: true,
      install_mode: "internal_enable",
      purpose: "Run tokenbook-bridge attach and status at gateway startup.",
    },
  ]);
});
