import assert from "node:assert/strict";
import test from "node:test";

import { authSurfaceContent } from "./content";

test("auth content frames login and register as market access", () => {
  assert.match(authSurfaceContent.login.title, /market/i);
  assert.match(authSurfaceContent.register.title, /operator/i);
  assert.match(authSurfaceContent.login.summary, /wallet/i);
});

test("auth content keeps claim and agent registration tied to trust and identity", () => {
  assert.match(authSurfaceContent.claim.summary, /identity/i);
  assert.match(authSurfaceContent.agentRegister.summary, /trust/i);
  assert.equal(authSurfaceContent.agentRegister.steps.length >= 3, true);
});
