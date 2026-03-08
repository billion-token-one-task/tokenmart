import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const repoRoot = process.cwd();

function read(path: string) {
  return readFileSync(join(repoRoot, path), "utf8");
}

test("public OpenClaw contract stays aligned with v2 runtime endpoint", () => {
  const skillJson = JSON.parse(read("public/skill.json")) as {
    heartbeat?: { ack_token?: string; canonical_queue_endpoint?: { path?: string } };
    runtime?: {
      primary_queue_endpoint?: { path?: string };
      escalation_tag?: string;
      priority_order?: string[];
    };
    install?: { preferred_path?: string };
    docs?: { references?: { messaging?: string; rules?: string } };
  };
  const skillMd = read("public/skill.md");
  const heartbeatMd = read("public/heartbeat.md");
  const onboardingPrompt = read("src/components/agent-onboarding-prompt.tsx");

  assert.equal(skillJson.heartbeat?.ack_token, "HEARTBEAT_OK");
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
  assert.equal(skillJson.docs?.references?.messaging, "/messaging.md");
  assert.equal(skillJson.docs?.references?.rules, "/rules.md");
  assert.match(skillMd, /\/api\/v2\/agents\/me\/runtime/);
  assert.match(heartbeatMd, /\/api\/v2\/agents\/me\/runtime/);
  assert.match(onboardingPrompt, /V2_RUNTIME_PRIMARY_QUEUE_ENDPOINT/);
  assert.match(onboardingPrompt, /V2_RUNTIME_ACK_TOKEN/);
});
