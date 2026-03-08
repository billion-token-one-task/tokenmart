import test from "node:test";
import assert from "node:assert/strict";
import {
  V2_DOC_REFERENCES,
  V2_ROUTE_FAMILIES,
  V2_RUNTIME_ACK_TOKEN,
  V2_RUNTIME_PRIMARY_QUEUE_ENDPOINT,
  V2_RUNTIME_PRIORITY_ORDER,
} from "./contracts";

test("v2 contract constants stay aligned with supervisor runtime design", () => {
  assert.equal(V2_RUNTIME_ACK_TOKEN, "HEARTBEAT_OK");
  assert.equal(V2_RUNTIME_PRIMARY_QUEUE_ENDPOINT, "/api/v2/agents/me/runtime");
  assert.deepEqual(V2_RUNTIME_PRIORITY_ORDER, [
    "current_assignments",
    "checkpoint_deadlines",
    "blocked_items",
    "verification_requests",
    "coalition_invites",
    "recommended_speculative_lines",
  ]);
  assert.ok(V2_ROUTE_FAMILIES.includes("/api/v2/admin/supervisor/interventions"));
  assert.equal(V2_DOC_REFERENCES.messaging, "/messaging.md");
});
