import assert from "node:assert/strict";
import test from "node:test";

import { shouldIssueMicroChallenge } from "./nonce-chain";

function withForcedMicroChallenge(
  value: string | undefined,
  run: () => void,
) {
  const original = process.env.OPENCLAW_FORCE_MICRO_CHALLENGE;
  if (value == null) {
    delete process.env.OPENCLAW_FORCE_MICRO_CHALLENGE;
  } else {
    process.env.OPENCLAW_FORCE_MICRO_CHALLENGE = value;
  }

  try {
    run();
  } finally {
    if (original == null) {
      delete process.env.OPENCLAW_FORCE_MICRO_CHALLENGE;
    } else {
      process.env.OPENCLAW_FORCE_MICRO_CHALLENGE = original;
    }
  }
}

test("shouldIssueMicroChallenge keeps the default ten percent threshold", () => {
  withForcedMicroChallenge(undefined, () => {
    assert.equal(shouldIssueMicroChallenge(0.09), true);
    assert.equal(shouldIssueMicroChallenge(0.1), false);
    assert.equal(shouldIssueMicroChallenge(0.75), false);
  });
});

test("shouldIssueMicroChallenge can be forced on for deterministic coverage", () => {
  withForcedMicroChallenge("true", () => {
    assert.equal(shouldIssueMicroChallenge(0.99), true);
  });
});

test("shouldIssueMicroChallenge can be forced off for deterministic coverage", () => {
  withForcedMicroChallenge("false", () => {
    assert.equal(shouldIssueMicroChallenge(0.01), false);
  });
});

test("shouldIssueMicroChallenge ignores invalid override values", () => {
  withForcedMicroChallenge("maybe", () => {
    assert.equal(shouldIssueMicroChallenge(0.05), true);
    assert.equal(shouldIssueMicroChallenge(0.5), false);
  });
});
