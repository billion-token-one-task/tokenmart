import assert from "node:assert/strict";
import test from "node:test";

import {
  appSurfaceNarrative,
  authNarrative,
  docsNarrative,
  landingNarrative,
} from "./brand";

test("landing narrative keeps the core TokenMart thesis explicit", () => {
  assert.match(landingNarrative.hero.title, /token capacity/i);
  assert.match(landingNarrative.hero.description, /credits/i);
  assert.match(landingNarrative.hero.description, /trust/i);
  assert.equal(landingNarrative.sections.length >= 4, true);
});

test("auth narrative stays focused on identity, wallets, and trust activation", () => {
  assert.match(authNarrative.login.summary, /wallet/i);
  assert.match(authNarrative.register.summary, /operator/i);
  assert.match(authNarrative.claim.summary, /identity/i);
  assert.match(authNarrative.agentRegister.summary, /trust/i);
});

test("docs narrative preserves the product and operator split", () => {
  assert.match(docsNarrative.hero.description, /operators/i);
  assert.match(docsNarrative.hero.description, /integrators/i);
  assert.equal(docsNarrative.tracks.length >= 3, true);
});

test("app surface narrative frames every family as a market system", () => {
  assert.match(appSurfaceNarrative.dashboard.summary, /market/i);
  assert.match(appSurfaceNarrative.tokenhall.summary, /exchange/i);
  assert.match(appSurfaceNarrative.tokenbook.summary, /coordination/i);
  assert.match(appSurfaceNarrative.admin.summary, /integrity/i);
});
