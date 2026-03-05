import assert from "node:assert/strict";
import test from "node:test";

import {
  buildCreditTransactionAuditAttempts,
  insertCreditTransactionAudit,
  type CreditTransactionWriterClient,
} from "./credit-transactions";

test("buildCreditTransactionAuditAttempts includes schema-variant rows in safe order", () => {
  const attempts = buildCreditTransactionAuditAttempts({
    agentId: "agent-1",
    amount: "50.00000000",
    type: "admin_grant",
    description: "seed credits",
    referenceId: "ref-1",
    balanceBefore: "10.00000000",
    balanceAfter: "60.00000000",
    creditId: "credit-1",
  });

  assert.deepEqual(attempts, [
    {
      agent_id: "agent-1",
      amount: "50.00000000",
      type: "admin_grant",
      description: "seed credits",
      reference_id: "ref-1",
    },
    {
      agent_id: "agent-1",
      amount: "50.00000000",
      type: "admin_grant",
      description: "seed credits",
      reference_id: "ref-1",
      balance_after: "60.00000000",
    },
    {
      agent_id: "agent-1",
      amount: "50.00000000",
      type: "admin_grant",
      description: "seed credits",
      reference_id: "ref-1",
      balance_before: "10.00000000",
      balance_after: "60.00000000",
    },
    {
      agent_id: "agent-1",
      amount: "50.00000000",
      type: "admin_grant",
      description: "seed credits",
      reference_id: "ref-1",
      balance_after: "60.00000000",
      credit_id: "credit-1",
    },
    {
      agent_id: "agent-1",
      amount: "50.00000000",
      type: "admin_grant",
      description: "seed credits",
      reference_id: "ref-1",
      balance_before: "10.00000000",
      balance_after: "60.00000000",
      credit_id: "credit-1",
    },
  ]);
});

test("insertCreditTransactionAudit retries richer variants until one succeeds", async () => {
  const insertedRows: Record<string, unknown>[] = [];
  const failures = [
    { message: 'null value in column "balance_after"' },
    { message: 'column "balance_before" does not exist' },
  ];

  const db: CreditTransactionWriterClient = {
    from() {
      return {
        async insert(row) {
          insertedRows.push(row);
          const error = failures.shift() ?? null;
          return { error };
        },
      };
    },
  };

  const result = await insertCreditTransactionAudit(db, {
    agentId: "agent-2",
    amount: "5.00000000",
    type: "purchase",
    balanceBefore: "0.00000000",
    balanceAfter: "5.00000000",
  });

  assert.equal(result.error, null);
  assert.deepEqual(insertedRows, [
    {
      agent_id: "agent-2",
      amount: "5.00000000",
      type: "purchase",
      description: null,
      reference_id: null,
    },
    {
      agent_id: "agent-2",
      amount: "5.00000000",
      type: "purchase",
      description: null,
      reference_id: null,
      balance_after: "5.00000000",
    },
    {
      agent_id: "agent-2",
      amount: "5.00000000",
      type: "purchase",
      description: null,
      reference_id: null,
      balance_before: "0.00000000",
      balance_after: "5.00000000",
    },
  ]);
});
