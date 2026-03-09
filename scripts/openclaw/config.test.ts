import assert from "node:assert/strict";
import test from "node:test";
import { loadOpenClawSuiteConfig, OPENCLAW_SCENARIOS } from "./config";

test("loadOpenClawSuiteConfig defaults to gateway wake with fast local defaults", () => {
  const env = {
    OPENCLAW_TEST_BASE_URL: process.env.OPENCLAW_TEST_BASE_URL,
    SMOKE_BASE_URL: process.env.SMOKE_BASE_URL,
    OPENCLAW_TEST_SERVER_MODE: process.env.OPENCLAW_TEST_SERVER_MODE,
    OPENCLAW_TEST_CLI_VERSION: process.env.OPENCLAW_TEST_CLI_VERSION,
    OPENCLAW_TEST_KEEP_ARTIFACTS: process.env.OPENCLAW_TEST_KEEP_ARTIFACTS,
    OPENCLAW_TEST_REQUIRE_TURN_SUCCESS: process.env.OPENCLAW_TEST_REQUIRE_TURN_SUCCESS,
    SMOKE_REQUIRE_OPENCLAW_TURN_SUCCESS: process.env.SMOKE_REQUIRE_OPENCLAW_TURN_SUCCESS,
    SMOKE_KEEP_TMP: process.env.SMOKE_KEEP_TMP,
    OPENCLAW_TEST_SCENARIOS: process.env.OPENCLAW_TEST_SCENARIOS,
    SMOKE_VERBOSE: process.env.SMOKE_VERBOSE,
  };

  try {
    delete process.env.OPENCLAW_TEST_BASE_URL;
    delete process.env.SMOKE_BASE_URL;
    delete process.env.OPENCLAW_TEST_SERVER_MODE;
    delete process.env.OPENCLAW_TEST_CLI_VERSION;
    delete process.env.OPENCLAW_TEST_KEEP_ARTIFACTS;
    delete process.env.OPENCLAW_TEST_REQUIRE_TURN_SUCCESS;
    delete process.env.SMOKE_REQUIRE_OPENCLAW_TURN_SUCCESS;
    delete process.env.SMOKE_KEEP_TMP;
    delete process.env.OPENCLAW_TEST_SCENARIOS;
    delete process.env.SMOKE_VERBOSE;

    const config = loadOpenClawSuiteConfig([]);
    assert.equal(config.serverMode, "auto");
    assert.equal(config.cliVersion, "latest");
    assert.equal(config.keepArtifacts, "fail");
    assert.equal(config.requireTurnSuccess, false);
    assert.deepEqual(config.scenarios, ["gateway_wake"]);
  } finally {
    for (const [key, value] of Object.entries(env)) {
      if (value == null) {
        delete process.env[key];
      } else {
        process.env[key] = value;
      }
    }
  }
});

test("loadOpenClawSuiteConfig honors explicit scenarios and legacy env fallbacks", () => {
  const env = {
    OPENCLAW_TEST_SERVER_MODE: process.env.OPENCLAW_TEST_SERVER_MODE,
    OPENCLAW_TEST_CLI_VERSION: process.env.OPENCLAW_TEST_CLI_VERSION,
    OPENCLAW_TEST_KEEP_ARTIFACTS: process.env.OPENCLAW_TEST_KEEP_ARTIFACTS,
    SMOKE_KEEP_TMP: process.env.SMOKE_KEEP_TMP,
    OPENCLAW_TEST_REQUIRE_TURN_SUCCESS: process.env.OPENCLAW_TEST_REQUIRE_TURN_SUCCESS,
    SMOKE_REQUIRE_OPENCLAW_TURN_SUCCESS: process.env.SMOKE_REQUIRE_OPENCLAW_TURN_SUCCESS,
    OPENCLAW_TEST_SCENARIOS: process.env.OPENCLAW_TEST_SCENARIOS,
  };

  try {
    process.env.OPENCLAW_TEST_SERVER_MODE = "spawn-start";
    process.env.OPENCLAW_TEST_CLI_VERSION = "2026.3.7";
    process.env.SMOKE_KEEP_TMP = "true";
    process.env.SMOKE_REQUIRE_OPENCLAW_TURN_SUCCESS = "true";
    process.env.OPENCLAW_TEST_SCENARIOS =
      "fresh_install,wipe_and_reinstall_same_fingerprint,strict_provider_turn";

    const config = loadOpenClawSuiteConfig([]);
    assert.equal(config.serverMode, "spawn-start");
    assert.equal(config.cliVersion, "2026.3.7");
    assert.equal(config.keepArtifacts, "always");
    assert.equal(config.requireTurnSuccess, true);
    assert.deepEqual(config.scenarios, [
      "fresh_install",
      "wipe_and_reinstall_same_fingerprint",
      "strict_provider_turn",
    ]);
  } finally {
    for (const [key, value] of Object.entries(env)) {
      if (value == null) {
        delete process.env[key];
      } else {
        process.env[key] = value;
      }
    }
  }
});

test("loadOpenClawSuiteConfig accepts repeated --scenario cli flags", () => {
  const config = loadOpenClawSuiteConfig([
    "--scenario",
    "fresh_install",
    "--scenario=gateway_wake",
    "--scenarios",
    "strict_provider_turn",
  ]);

  assert.deepEqual(config.scenarios, [
    "fresh_install",
    "gateway_wake",
    "strict_provider_turn",
  ]);
});

test("known scenario list stays explicit", () => {
  assert.deepEqual(OPENCLAW_SCENARIOS, [
    "fresh_install",
    "wipe_and_reinstall_same_fingerprint",
    "wipe_and_reinstall_new_fingerprint",
    "gateway_wake",
    "strict_provider_turn",
  ]);
});
