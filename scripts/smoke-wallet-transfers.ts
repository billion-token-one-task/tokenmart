import { createClient } from "@supabase/supabase-js";
import { readFileSync, existsSync } from "fs";

type Json = Record<string, unknown>;

const baseUrl = (process.env.SMOKE_BASE_URL ?? "http://127.0.0.1:3000").replace(/\/$/, "");
const runId = Date.now();

interface StepResult {
  name: string;
  status: number;
  ok: boolean;
  details?: string;
}

const results: StepResult[] = [];

function loadEnv() {
  const envFiles = [".env.local", ".env"];
  for (const envFile of envFiles) {
    if (!existsSync(envFile)) continue;
    const text = readFileSync(envFile, "utf8");
    for (const line of text.split("\n")) {
      const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.+)\s*$/);
      if (!match) continue;
      if (process.env[match[1]] == null) {
        process.env[match[1]] = match[2];
      }
    }
  }
}

function asObj(value: unknown): Json {
  if (!value || typeof value !== "object") throw new Error("Expected object response");
  return value as Json;
}

function authHeaders(token: string, agentId?: string): Record<string, string> {
  return {
    Authorization: `Bearer ${token}`,
    ...(agentId ? { "X-Agent-Id": agentId } : {}),
    "Content-Type": "application/json",
  };
}

async function requestJson(
  name: string,
  path: string,
  init: RequestInit,
  expectedStatus?: number | number[],
): Promise<{ status: number; data: unknown; headers: Headers }> {
  const url = `${baseUrl}${path}`;
  const res = await fetch(url, init);

  let data: unknown = null;
  const text = await res.text();
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = text;
    }
  }

  let ok = res.ok;
  if (expectedStatus != null) {
    const accepted = Array.isArray(expectedStatus) ? expectedStatus : [expectedStatus];
    ok = accepted.includes(res.status);
  }

  results.push({
    name,
    status: res.status,
    ok,
    details: typeof data === "string" ? data.slice(0, 240) : undefined,
  });

  if (!ok) {
    throw new Error(`${name} failed (${res.status}): ${typeof data === "string" ? data : JSON.stringify(data)}`);
  }

  return { status: res.status, data, headers: res.headers };
}

function printSummary() {
  console.log("\nWallet transfer smoke summary:");
  for (const result of results) {
    const mark = result.ok ? "PASS" : "FAIL";
    console.log(`- [${mark}] ${result.name} (${result.status})`);
  }

  const failures = results.filter((r) => !r.ok);
  if (failures.length > 0) {
    const names = failures.map((f) => f.name).join(", ");
    throw new Error(`Smoke run has failures: ${names}`);
  }
}

function decimalToNumber(value: unknown): number {
  if (typeof value === "number") return Number.isFinite(value) ? value : NaN;
  if (typeof value === "string") return Number.parseFloat(value);
  return NaN;
}

function assertApproxEqual(name: string, actual: number, expected: number, epsilon = 0.0000001) {
  if (!Number.isFinite(actual)) {
    throw new Error(`${name} is not finite: ${actual}`);
  }
  if (Math.abs(actual - expected) > epsilon) {
    throw new Error(`${name} mismatch. expected=${expected} actual=${actual}`);
  }
}

async function main() {
  loadEnv();

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRole) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required");
  }

  const adminDb = createClient(supabaseUrl, serviceRole, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  console.log(`Running wallet transfer smoke test against ${baseUrl}`);

  const email = `walletsmoke+${runId}@tokenmart.local`;
  const password = `WalletSmoke_${runId}_Pass!`;
  const agentName1 = `wallet_smoke_a_${runId}`;
  const agentName2 = `wallet_smoke_b_${runId}`;

  await requestJson(
    "register account",
    "/api/v1/auth/register",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, display_name: "Wallet Smoke" }),
    },
    201,
  );

  const loginData = asObj((await requestJson(
    "login account",
    "/api/v1/auth/login",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    },
    200,
  )).data);
  const sessionToken = String(loginData.refresh_token);

  const regAgent1 = asObj((await requestJson(
    "register agent 1",
    "/api/v1/agents/register",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: agentName1, harness: "openclaw", description: "wallet smoke" }),
    },
    201,
  )).data);

  const regAgent2 = asObj((await requestJson(
    "register agent 2",
    "/api/v1/agents/register",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: agentName2, harness: "openclaw", description: "wallet smoke" }),
    },
    201,
  )).data);

  const agentId1 = String(regAgent1.agent_id);
  const agentId2 = String(regAgent2.agent_id);
  const agentToken1 = String(regAgent1.api_key);
  const claimCode1 = String(regAgent1.claim_code);
  const claimCode2 = String(regAgent2.claim_code);

  await requestJson(
    "claim agent 1",
    "/api/v1/auth/claim",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ claim_code: claimCode1, refresh_token: sessionToken }),
    },
    200,
  );

  await requestJson(
    "claim agent 2",
    "/api/v1/auth/claim",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ claim_code: claimCode2, refresh_token: sessionToken }),
    },
    200,
  );

  const accountCredits = asObj((await requestJson(
    "fetch account credits/wallets",
    "/api/v1/tokenhall/credits",
    {
      method: "GET",
      headers: authHeaders(sessionToken),
    },
    200,
  )).data);

  const wallets = asObj(accountCredits.wallets);
  const mainWallet = asObj(wallets.main);
  const agentWallets = Array.isArray(wallets.agents) ? wallets.agents.map((w) => asObj(w)) : [];
  const agentWallet1 = agentWallets.find((w) => String(w.agent_id) === agentId1);
  const agentWallet2 = agentWallets.find((w) => String(w.agent_id) === agentId2);

  if (!agentWallet1 || !agentWallet2) {
    throw new Error("Could not resolve agent sub-wallets from credits response");
  }

  const mainWalletAddress = String(mainWallet.wallet_address);
  const agentWalletAddress1 = String(agentWallet1.wallet_address);
  const agentWalletAddress2 = String(agentWallet2.wallet_address);

  const { error: seedMainErr } = await adminDb
    .from("account_credit_wallets")
    .update({ balance: "25.00000000" })
    .eq("wallet_address", mainWalletAddress);
  if (seedMainErr) throw new Error(`Failed to seed main wallet balance: ${seedMainErr.message}`);

  const { error: seedAgent1Err } = await adminDb
    .from("credits")
    .update({ balance: "10.00000000" })
    .eq("wallet_address", agentWalletAddress1);
  if (seedAgent1Err) throw new Error(`Failed to seed agent1 wallet balance: ${seedAgent1Err.message}`);

  const { error: seedAgent2Err } = await adminDb
    .from("credits")
    .update({ balance: "0.00000000" })
    .eq("wallet_address", agentWalletAddress2);
  if (seedAgent2Err) throw new Error(`Failed to seed agent2 wallet balance: ${seedAgent2Err.message}`);

  const transferA = asObj((await requestJson(
    "session transfer main->agent2",
    "/api/v1/tokenhall/transfers",
    {
      method: "POST",
      headers: authHeaders(sessionToken),
      body: JSON.stringify({
        to_agent_id: agentId2,
        amount: 5,
        memo: "wallet smoke session transfer",
      }),
    },
    201,
  )).data);

  const transferB = asObj((await requestJson(
    "agent key transfer agent1->agent2",
    "/api/v1/tokenhall/transfers",
    {
      method: "POST",
      headers: authHeaders(agentToken1),
      body: JSON.stringify({
        to_agent_id: agentId2,
        amount: 3,
        memo: "wallet smoke agent transfer",
      }),
    },
    201,
  )).data);

  await requestJson(
    "agent key blocked from another source wallet",
    "/api/v1/tokenhall/transfers",
    {
      method: "POST",
      headers: authHeaders(agentToken1),
      body: JSON.stringify({
        from_agent_id: agentId2,
        to_agent_id: agentId1,
        amount: 1,
      }),
    },
    403,
  );

  const transferListSession = asObj((await requestJson(
    "list transfers (session scope)",
    "/api/v1/tokenhall/transfers",
    {
      method: "GET",
      headers: authHeaders(sessionToken),
    },
    200,
  )).data);

  const transferListAgent = asObj((await requestJson(
    "list transfers (agent scope)",
    "/api/v1/tokenhall/transfers",
    {
      method: "GET",
      headers: authHeaders(agentToken1),
    },
    200,
  )).data);

  const transferIdA = String(asObj(transferA.transfer).transfer_id);
  const transferIdB = String(asObj(transferB.transfer).transfer_id);
  const transfersSession = Array.isArray(transferListSession.transfers) ? transferListSession.transfers : [];
  const transfersAgent = Array.isArray(transferListAgent.transfers) ? transferListAgent.transfers : [];

  const hasAInSession = transfersSession.some((row) => String(asObj(row).transfer_id) === transferIdA);
  const hasBInSession = transfersSession.some((row) => String(asObj(row).transfer_id) === transferIdB);
  const hasBInAgent = transfersAgent.some((row) => String(asObj(row).transfer_id) === transferIdB);

  if (!hasAInSession || !hasBInSession || !hasBInAgent) {
    throw new Error("Expected transfer IDs were not found in transfer history responses");
  }

  const { data: mainWalletAfter, error: mainWalletReadErr } = await adminDb
    .from("account_credit_wallets")
    .select("balance")
    .eq("wallet_address", mainWalletAddress)
    .single();
  if (mainWalletReadErr || !mainWalletAfter) {
    throw new Error(`Failed reading main wallet after transfers: ${mainWalletReadErr?.message ?? "unknown"}`);
  }

  const { data: agentWallet1After, error: agent1ReadErr } = await adminDb
    .from("credits")
    .select("balance")
    .eq("wallet_address", agentWalletAddress1)
    .single();
  if (agent1ReadErr || !agentWallet1After) {
    throw new Error(`Failed reading agent1 wallet after transfers: ${agent1ReadErr?.message ?? "unknown"}`);
  }

  const { data: agentWallet2After, error: agent2ReadErr } = await adminDb
    .from("credits")
    .select("balance")
    .eq("wallet_address", agentWalletAddress2)
    .single();
  if (agent2ReadErr || !agentWallet2After) {
    throw new Error(`Failed reading agent2 wallet after transfers: ${agent2ReadErr?.message ?? "unknown"}`);
  }

  assertApproxEqual("main wallet balance", decimalToNumber(mainWalletAfter.balance), 20);
  assertApproxEqual("agent1 wallet balance", decimalToNumber(agentWallet1After.balance), 7);
  assertApproxEqual("agent2 wallet balance", decimalToNumber(agentWallet2After.balance), 8);

  console.log("Transfer addresses:");
  console.log(`- main:   ${mainWalletAddress}`);
  console.log(`- agent1: ${agentWalletAddress1}`);
  console.log(`- agent2: ${agentWalletAddress2}`);
  printSummary();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
