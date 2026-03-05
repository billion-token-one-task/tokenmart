import assert from "node:assert/strict";
import test from "node:test";

import { resolveSmokeBaseUrl, shouldRequireCorsAgentHeader } from "./smoke-targets";

test("resolveSmokeBaseUrl uses production default when target is prod", () => {
  const original = process.env.SMOKE_BASE_URL;
  delete process.env.SMOKE_BASE_URL;

  assert.equal(resolveSmokeBaseUrl("prod"), "https://www.tokenmart.net");

  if (original == null) delete process.env.SMOKE_BASE_URL;
  else process.env.SMOKE_BASE_URL = original;
});

test("resolveSmokeBaseUrl uses development default when target is dev", () => {
  const original = process.env.SMOKE_BASE_URL;
  delete process.env.SMOKE_BASE_URL;

  assert.equal(resolveSmokeBaseUrl("dev"), "http://127.0.0.1:3000");

  if (original == null) delete process.env.SMOKE_BASE_URL;
  else process.env.SMOKE_BASE_URL = original;
});

test("resolveSmokeBaseUrl respects explicit override", () => {
  const original = process.env.SMOKE_BASE_URL;
  process.env.SMOKE_BASE_URL = "https://example.test/";

  assert.equal(resolveSmokeBaseUrl("dev"), "https://example.test");
  assert.equal(resolveSmokeBaseUrl("prod"), "https://example.test");

  if (original == null) delete process.env.SMOKE_BASE_URL;
  else process.env.SMOKE_BASE_URL = original;
});

test("shouldRequireCorsAgentHeader stays strict for prod and relaxed for dev by default", () => {
  const original = process.env.SMOKE_REQUIRE_CORS_AGENT_HEADER;
  delete process.env.SMOKE_REQUIRE_CORS_AGENT_HEADER;

  assert.equal(shouldRequireCorsAgentHeader("prod"), true);
  assert.equal(shouldRequireCorsAgentHeader("dev"), false);

  if (original == null) delete process.env.SMOKE_REQUIRE_CORS_AGENT_HEADER;
  else process.env.SMOKE_REQUIRE_CORS_AGENT_HEADER = original;
});

test("shouldRequireCorsAgentHeader respects explicit override", () => {
  const original = process.env.SMOKE_REQUIRE_CORS_AGENT_HEADER;
  process.env.SMOKE_REQUIRE_CORS_AGENT_HEADER = "true";
  assert.equal(shouldRequireCorsAgentHeader("dev"), true);

  process.env.SMOKE_REQUIRE_CORS_AGENT_HEADER = "false";
  assert.equal(shouldRequireCorsAgentHeader("prod"), false);

  if (original == null) delete process.env.SMOKE_REQUIRE_CORS_AGENT_HEADER;
  else process.env.SMOKE_REQUIRE_CORS_AGENT_HEADER = original;
});
