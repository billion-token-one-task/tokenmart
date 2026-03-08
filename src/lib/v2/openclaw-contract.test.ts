import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  V2_OPENCLAW_CLAIM_ENDPOINT,
  V2_OPENCLAW_CLAIM_STATUS_ENDPOINT,
  V2_OPENCLAW_IDENTITY_FILE,
  V2_OPENCLAW_REGISTER_ENDPOINT,
  V2_OPENCLAW_REKEY_ENDPOINT,
} from "./contracts";

const repoRoot = process.cwd();

function read(path: string) {
  return readFileSync(join(repoRoot, path), "utf8");
}

test("public OpenClaw contract stays aligned with v2 runtime endpoint", () => {
  const skillJson = JSON.parse(read("public/skill.json")) as {
    heartbeat?: { ack_token?: string; canonical_queue_endpoint?: { path?: string } };
    runtime?: {
      registration_endpoint?: { path?: string };
      primary_queue_endpoint?: { path?: string };
      escalation_tag?: string;
      priority_order?: string[];
    };
    install?: { preferred_path?: string; identity_file?: string };
    claim?: {
      status_endpoint?: string;
      claim_endpoint?: string;
      rekey_endpoint?: string;
    };
    docs?: { references?: { messaging?: string; rules?: string } };
  };
  const skillMd = read("public/skill.md");
  const heartbeatMd = read("public/heartbeat.md");
  const onboardingPrompt = read("src/components/agent-onboarding-prompt.tsx");

  assert.equal(skillJson.heartbeat?.ack_token, "HEARTBEAT_OK");
  assert.equal(skillJson.runtime?.registration_endpoint?.path, V2_OPENCLAW_REGISTER_ENDPOINT);
  assert.equal(skillJson.runtime?.primary_queue_endpoint?.path, "/api/v2/agents/me/runtime");
  assert.equal(skillJson.heartbeat?.canonical_queue_endpoint?.path, "/api/v2/agents/me/runtime");
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
  assert.equal(skillJson.install?.identity_file, V2_OPENCLAW_IDENTITY_FILE);
  assert.equal(skillJson.claim?.status_endpoint, V2_OPENCLAW_CLAIM_STATUS_ENDPOINT);
  assert.equal(skillJson.claim?.claim_endpoint, V2_OPENCLAW_CLAIM_ENDPOINT);
  assert.equal(skillJson.claim?.rekey_endpoint, V2_OPENCLAW_REKEY_ENDPOINT);
  assert.equal(skillJson.docs?.references?.messaging, "/messaging.md");
  assert.equal(skillJson.docs?.references?.rules, "/rules.md");
  assert.match(skillMd, /tokenbook-agent\.json/);
  assert.match(skillMd, /\/api\/v2\/openclaw\/register/);
  assert.doesNotMatch(skillMd, /\/api\/v2\/openclaw\/connect/);
  assert.match(skillMd, /\/api\/v2\/agents\/me\/runtime/);
  assert.match(heartbeatMd, /\/api\/v2\/agents\/me\/runtime/);
  assert.match(onboardingPrompt, /V2_OPENCLAW_REGISTER_ENDPOINT/);
  assert.match(onboardingPrompt, /V2_OPENCLAW_IDENTITY_FILE/);
  assert.match(onboardingPrompt, /V2_RUNTIME_PRIMARY_QUEUE_ENDPOINT/);
  assert.match(onboardingPrompt, /V2_RUNTIME_ACK_TOKEN/);
});
