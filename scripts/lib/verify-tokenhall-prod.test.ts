import assert from "node:assert/strict";
import test from "node:test";

import {
  buildFundingStrategies,
  resolveAdminCredentials,
} from "./verify-tokenhall-prod";

test("resolveAdminCredentials trims and prefers explicit args", () => {
  const credentials = resolveAdminCredentials(
    {
      "admin-email": "  ops@tokenmart.net  ",
      "admin-password": "  secret  ",
    },
    {
      ADMIN_EMAIL: "env@example.com",
      ADMIN_PASSWORD: "env-password",
    } as unknown as NodeJS.ProcessEnv,
  );

  assert.equal(credentials.email, "ops@tokenmart.net");
  assert.equal(credentials.password, "secret");
  assert.equal(credentials.isComplete, true);
  assert.equal(credentials.note, null);
});

test("resolveAdminCredentials reports partial credentials without treating them as usable", () => {
  const credentials = resolveAdminCredentials(
    {
      "admin-email": "admin@example.com",
    },
    {} as unknown as NodeJS.ProcessEnv,
  );

  assert.equal(credentials.isComplete, false);
  assert.match(credentials.note ?? "", /incomplete/i);
});

test("buildFundingStrategies prefers admin, then service-role, then safe continuation", () => {
  const strategies = buildFundingStrategies({
    adminCredentials: {
      email: "admin@example.com",
      password: "secret",
      isComplete: true,
      note: null,
    },
    supabaseUrl: "https://example.supabase.co",
    serviceRoleKey: "service-role",
    openrouterApiKey: "openrouter-key",
  });

  assert.deepEqual(strategies, ["admin-api", "service-role", "continue-with-byok"]);
});

test("buildFundingStrategies falls back safely when admin credentials are missing", () => {
  const strategies = buildFundingStrategies({
    adminCredentials: {
      email: "",
      password: "",
      isComplete: false,
      note: "Admin credentials missing.",
    },
    supabaseUrl: "",
    serviceRoleKey: "",
    openrouterApiKey: "",
  });

  assert.deepEqual(strategies, ["continue-without-funding"]);
});

test("buildFundingStrategies keeps a final safe continuation after service-role fallback", () => {
  const strategies = buildFundingStrategies({
    adminCredentials: {
      email: "",
      password: "",
      isComplete: false,
      note: "Admin credentials missing.",
    },
    supabaseUrl: "https://example.supabase.co",
    serviceRoleKey: "service-role",
    openrouterApiKey: "",
  });

  assert.deepEqual(strategies, ["service-role", "continue-without-funding"]);
});
