export interface CreditTransactionAuditInput {
  agentId: string;
  amount: string;
  type: string;
  description?: string | null;
  referenceId?: string | null;
  balanceBefore?: string | null;
  balanceAfter?: string | null;
  creditId?: string | null;
}

export interface CreditTransactionInsertError {
  message?: string;
}

interface CreditTransactionInsertResult {
  error: CreditTransactionInsertError | null;
}

interface CreditTransactionTableWriter {
  insert: (row: Record<string, unknown>) => PromiseLike<CreditTransactionInsertResult>;
}

export interface CreditTransactionWriterClient {
  from: (table: "credit_transactions") => CreditTransactionTableWriter;
}

function compactRow(row: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(row).filter(([, value]) => value !== undefined)
  );
}

function dedupeAttempts(attempts: Record<string, unknown>[]): Record<string, unknown>[] {
  const seen = new Set<string>();
  const unique: Record<string, unknown>[] = [];

  for (const attempt of attempts) {
    const key = JSON.stringify(attempt);
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push(attempt);
  }

  return unique;
}

export function buildCreditTransactionAuditAttempts(
  input: CreditTransactionAuditInput
): Record<string, unknown>[] {
  const base = compactRow({
    agent_id: input.agentId,
    amount: input.amount,
    type: input.type,
    description: input.description ?? null,
    reference_id: input.referenceId ?? null,
  });

  const attempts: Record<string, unknown>[] = [base];

  if (input.balanceAfter != null) {
    attempts.push(
      compactRow({
        ...base,
        balance_after: input.balanceAfter,
      })
    );
  }

  if (input.balanceBefore != null && input.balanceAfter != null) {
    attempts.push(
      compactRow({
        ...base,
        balance_before: input.balanceBefore,
        balance_after: input.balanceAfter,
      })
    );
  }

  if (input.creditId != null && input.balanceAfter != null) {
    attempts.push(
      compactRow({
        ...base,
        balance_after: input.balanceAfter,
        credit_id: input.creditId,
      })
    );
  }

  if (
    input.creditId != null &&
    input.balanceBefore != null &&
    input.balanceAfter != null
  ) {
    attempts.push(
      compactRow({
        ...base,
        balance_before: input.balanceBefore,
        balance_after: input.balanceAfter,
        credit_id: input.creditId,
      })
    );
  }

  return dedupeAttempts(attempts);
}

export async function insertCreditTransactionAudit(
  db: CreditTransactionWriterClient,
  input: CreditTransactionAuditInput
): Promise<CreditTransactionInsertResult> {
  const attempts = buildCreditTransactionAuditAttempts(input);
  let lastResult: CreditTransactionInsertResult = {
    error: { message: "No credit transaction insert attempts were generated" },
  };

  for (const attempt of attempts) {
    const result = await db.from("credit_transactions").insert(attempt);
    if (!result.error) {
      return result;
    }
    lastResult = result;
  }

  return lastResult;
}
