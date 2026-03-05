import assert from "node:assert/strict";
import test from "node:test";

import { planAdminAccountSync } from "./sync-admin-account";

test("planAdminAccountSync updates configured account when it already exists", () => {
  const plan = planAdminAccountSync({
    configuredEmail: "admin@tokenmart.net",
    configuredAccount: {
      id: "acct-1",
      email: "admin@tokenmart.net",
      role: "super_admin",
    },
    superAdmins: [
      {
        id: "acct-1",
        email: "admin@tokenmart.net",
        role: "super_admin",
      },
    ],
  });

  assert.deepEqual(plan, {
    action: "update-configured",
    targetId: "acct-1",
    targetEmail: "admin@tokenmart.net",
  });
});

test("planAdminAccountSync migrates a single legacy super admin to the configured email", () => {
  const plan = planAdminAccountSync({
    configuredEmail: "admin@tokenmart.net",
    configuredAccount: null,
    superAdmins: [
      {
        id: "acct-legacy",
        email: "admin@tokenmart.local",
        role: "super_admin",
      },
    ],
  });

  assert.deepEqual(plan, {
    action: "migrate-single-super-admin",
    targetId: "acct-legacy",
    fromEmail: "admin@tokenmart.local",
    targetEmail: "admin@tokenmart.net",
  });
});

test("planAdminAccountSync creates a configured admin when existing super admins are ambiguous", () => {
  const plan = planAdminAccountSync({
    configuredEmail: "admin@tokenmart.net",
    configuredAccount: null,
    superAdmins: [
      { id: "acct-1", email: "admin1@example.com", role: "super_admin" },
      { id: "acct-2", email: "admin2@example.com", role: "super_admin" },
    ],
  });

  assert.deepEqual(plan, {
    action: "create-configured",
    targetEmail: "admin@tokenmart.net",
    reason: "ambiguous-existing-super-admins",
  });
});
