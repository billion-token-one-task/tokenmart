import { createClient } from "@supabase/supabase-js";
import { existsSync, readFileSync } from "node:fs";
import { insertCreditTransactionAudit } from "../src/lib/tokenhall/credit-transactions";
import {
  buildFundingStrategies,
  resolveAdminCredentials,
} from "./lib/verify-tokenhall-prod";

type Json = Record<string, unknown>;

interface Check {
  name: string;
  ok: boolean;
  details?: string;
}

interface RequestResult {
  status: number;
  headers: Headers;
  data: unknown;
  text: string;
}

const DEFAULT_BASE_URL = "https://www.tokenmart.net";
const TEST_MODELS = [
  "minimax/minimax-m2.5",
  "google/gemini-3-flash-preview",
  "moonshotai/kimi-k2.5",
  "deepseek/deepseek-v3.2",
  "arcee-ai/trinity-large-preview:free",
];

function parseArgs(argv: string[]) {
  const args: Record<string, string | boolean> = {};
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (!token.startsWith("--")) continue;
    const key = token.slice(2);
    const next = argv[i + 1];
    if (!next || next.startsWith("--")) {
      args[key] = true;
    } else {
      args[key] = next;
      i += 1;
    }
  }
  return args;
}

function toObj(value: unknown): Json {
  if (!value || typeof value !== "object") {
    throw new Error(`Expected object, got ${typeof value}`);
  }
  return value as Json;
}

function getHeader(headers: Headers, name: string): string {
  return headers.get(name) ?? headers.get(name.toLowerCase()) ?? "";
}

function loadEnv() {
  for (const envFile of [".env.local", ".env"]) {
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

async function requestJson(
  baseUrl: string,
  path: string,
  init: RequestInit,
): Promise<RequestResult> {
  const url = `${baseUrl}${path}`;
  const response = await fetch(url, init);
  const text = await response.text();
  let data: unknown = null;
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = text;
    }
  }
  return {
    status: response.status,
    headers: response.headers,
    data,
    text,
  };
}

async function parseSseStream(response: Response) {
  if (!response.body) {
    throw new Error("Missing streaming response body");
  }

  const decoder = new TextDecoder();
  const reader = response.body.getReader();

  let buffer = "";
  let doneSeen = false;
  let chunksSeen = 0;
  let usageSeen = false;
  let assembledText = "";

  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || !trimmed.startsWith("data: ")) continue;

        const payload = trimmed.slice(6);
        if (payload === "[DONE]") {
          doneSeen = true;
          continue;
        }

        let json: unknown;
        try {
          json = JSON.parse(payload);
        } catch {
          continue;
        }

        const row = toObj(json);
        const maybeError = row.error as Json | undefined;
        if (maybeError?.message) {
          throw new Error(`Stream error payload: ${String(maybeError.message)}`);
        }

        if (row.object === "chat.completion.chunk") {
          chunksSeen += 1;
          const choices = Array.isArray(row.choices) ? row.choices : [];
          const first = choices[0] && typeof choices[0] === "object" ? (choices[0] as Json) : null;
          const delta = first?.delta && typeof first.delta === "object" ? (first.delta as Json) : null;
          if (typeof delta?.content === "string") {
            assembledText += delta.content;
          }
        }

        if (row.usage && typeof row.usage === "object") {
          usageSeen = true;
        }
      }
    }
  } finally {
    reader.releaseLock();
  }

  return {
    doneSeen,
    chunksSeen,
    usageSeen,
    assembledText,
  };
}

async function run() {
  loadEnv();

  const args = parseArgs(process.argv.slice(2));
  const baseUrl = String(args["base-url"] ?? process.env.VERIFY_BASE_URL ?? DEFAULT_BASE_URL).replace(/\/$/, "");
  const openrouterApiKey = String(args["openrouter-key"] ?? process.env.OPENROUTER_API_KEY ?? "").trim();
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() ?? "";
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() ?? "";
  const adminCredentials = resolveAdminCredentials(args);
  const fundingStrategies = buildFundingStrategies({
    adminCredentials,
    supabaseUrl,
    serviceRoleKey,
    openrouterApiKey,
  });

  console.log(`Verifying TokenHall production API at ${baseUrl}`);
  if (adminCredentials.note) {
    console.log(adminCredentials.note);
  }

  const checks: Check[] = [];
  const runId = Date.now();
  const testEmail = `stream-verify+${runId}@tokenmart.local`;
  const testPassword = `StreamVerify_${runId}_Pass!`;
  const displayName = `stream-verify-${runId}`;
  const agentName = `stream_verify_${runId}`;

  let sessionToken = "";
  let agentId = "";
  let mgmtKey = "";
  let mgmtKeyId = "";
  let inferKey = "";
  let inferKeyId = "";
  let providerKeyId: string | null = null;
  let ownerAccountId: string | null = null;

  // 1) Create a dedicated test account.
  const reg = await requestJson(baseUrl, "/api/v1/auth/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: testEmail, password: testPassword, display_name: displayName }),
  });
  checks.push({
    name: "register test account",
    ok: reg.status === 201,
    details: `status=${reg.status}`,
  });
  if (reg.status !== 201) {
    throw new Error(`Failed to register test account (${reg.status}): ${reg.text}`);
  }

  // 2) Login test account.
  const login = await requestJson(baseUrl, "/api/v1/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: testEmail, password: testPassword }),
  });
  if (login.status !== 200) {
    throw new Error(`Failed to login test account (${login.status}): ${login.text}`);
  }
  sessionToken = String(toObj(login.data).refresh_token ?? "");
  if (!sessionToken) {
    throw new Error("Login succeeded but refresh_token missing");
  }
  checks.push({ name: "login test account", ok: true });

  // 3) Register + claim dedicated agent.
  const agentReg = await requestJson(baseUrl, "/api/v1/agents/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name: agentName, harness: "custom", description: "prod streaming verification" }),
  });
  if (agentReg.status !== 201) {
    throw new Error(`Failed to register test agent (${agentReg.status}): ${agentReg.text}`);
  }
  const agentRegBody = toObj(agentReg.data);
  agentId = String(agentRegBody.agent_id ?? "");
  const claimCode = String(agentRegBody.claim_code ?? "");
  if (!agentId || !claimCode) {
    throw new Error("Agent register response missing agent_id or claim_code");
  }

  const claim = await requestJson(baseUrl, "/api/v1/auth/claim", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ claim_code: claimCode, refresh_token: sessionToken }),
  });
  if (claim.status !== 200) {
    throw new Error(`Failed to claim test agent (${claim.status}): ${claim.text}`);
  }
  ownerAccountId = String(toObj(claim.data).owner_account_id ?? "");
  checks.push({ name: "register + claim test agent", ok: true });

  // 4) Prepare credits for the test agent using the safest available funding path.
  const grantDescription = `Production streaming verification funding (${runId})`;
  const grantAttempts = ["admin_grant", "purchase"];
  const fundingNotes: string[] = [];
  let fundingReady = false;
  let fundingPath = "";

  for (const strategy of fundingStrategies) {
    if (strategy === "admin-api") {
      const adminLogin = await requestJson(baseUrl, "/api/v1/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: adminCredentials.email,
          password: adminCredentials.password,
        }),
      });

      if (adminLogin.status !== 200) {
        const staleCredentialHint =
          adminLogin.status === 401
            ? " - configured admin credentials are stale or invalid for production"
            : "";
        fundingNotes.push(`admin login failed (${adminLogin.status})${staleCredentialHint}`);
        continue;
      }

      const adminSession = String(toObj(adminLogin.data).refresh_token ?? "");
      if (!adminSession) {
        fundingNotes.push("admin login succeeded but refresh_token missing");
        continue;
      }

      let grantApplied = false;
      for (const type of grantAttempts) {
        const grant = await requestJson(baseUrl, "/api/v1/admin/credits", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${adminSession}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            agent_id: agentId,
            amount: 50,
            type,
            description: grantDescription,
          }),
        });

        if (grant.status === 200) {
          grantApplied = true;
          fundingReady = true;
          fundingPath = "admin credit grant via /api/v1/admin/credits";
          break;
        }

        fundingNotes.push(`admin credit grant ${type} failed (${grant.status})`);
      }

      if (grantApplied) {
        break;
      }

      continue;
    }

    if (strategy === "service-role") {
      const supabase = createClient(supabaseUrl, serviceRoleKey, {
        auth: { autoRefreshToken: false, persistSession: false },
      });

      const creditsResult = await supabase
        .from("credits")
        .select("id, balance, total_earned")
        .eq("agent_id", agentId)
        .maybeSingle();

      if (creditsResult.error) {
        fundingNotes.push(`service-role fallback read failed (${creditsResult.error.message})`);
        continue;
      }

      if (!creditsResult.data) {
        const insertResult = await supabase.from("credits").insert({
          agent_id: agentId,
          account_id: ownerAccountId || null,
          balance: "50.00000000",
          total_earned: "50.00000000",
        });
        if (insertResult.error) {
          fundingNotes.push(`service-role fallback insert failed (${insertResult.error.message})`);
          continue;
        }
      } else {
        const currentBalance =
          Number.parseFloat(String(creditsResult.data.balance ?? "0")) || 0;
        const currentEarned =
          Number.parseFloat(String(creditsResult.data.total_earned ?? "0")) || 0;
        const updateResult = await supabase
          .from("credits")
          .update({
            balance: (currentBalance + 50).toFixed(8),
            total_earned: (currentEarned + 50).toFixed(8),
            updated_at: new Date().toISOString(),
          })
          .eq("id", creditsResult.data.id);
        if (updateResult.error) {
          fundingNotes.push(`service-role fallback update failed (${updateResult.error.message})`);
          continue;
        }
      }

      const previousBalance =
        creditsResult.data == null
          ? "0.00000000"
          : (
              Number.parseFloat(String(creditsResult.data.balance ?? "0")) || 0
            ).toFixed(8);
      const nextBalance =
        creditsResult.data == null
          ? "50.00000000"
          : (
              (Number.parseFloat(String(creditsResult.data.balance ?? "0")) || 0) + 50
            ).toFixed(8);

      const txInsert = await insertCreditTransactionAudit(supabase, {
        agentId,
        type: "admin_grant",
        amount: "50.00000000",
        description: `${grantDescription} (service-role fallback)`,
        balanceBefore: previousBalance,
        balanceAfter: nextBalance,
      });
      if (txInsert.error) {
        fundingNotes.push(`transaction log skipped (${txInsert.error.message ?? "unknown error"})`);
      }

      fundingReady = true;
      fundingPath = "service-role credit fallback";
      break;
    }

    if (strategy === "continue-with-byok") {
      fundingReady = true;
      fundingPath = "continuing without grant because OPENROUTER_API_KEY is available";
      break;
    }

    fundingReady = true;
    fundingPath =
      "continuing without explicit funding grant; later checks will validate platform defaults or free-model access";
    break;
  }

  checks.push({
    name: "verification funding path",
    ok: fundingReady,
    details: [fundingPath, ...fundingNotes].filter(Boolean).join("; "),
  });

  if (!fundingReady) {
    throw new Error("No viable funding path available for verification");
  }

  // 5) Create TokenHall management + inference keys.
  const sessionHeaders = {
    Authorization: `Bearer ${sessionToken}`,
    "X-Agent-Id": agentId,
    "Content-Type": "application/json",
  };

  const mgmtResp = await requestJson(baseUrl, "/api/v1/tokenhall/keys", {
    method: "POST",
    headers: sessionHeaders,
    body: JSON.stringify({ name: `verify-mgmt-${runId}`, is_management_key: true, rate_limit_rpm: 120 }),
  });
  if (mgmtResp.status !== 201) {
    throw new Error(`Failed to create management key (${mgmtResp.status}): ${mgmtResp.text}`);
  }
  const mgmtObj = toObj(toObj(mgmtResp.data).key);
  mgmtKey = String(mgmtObj.raw_key ?? "");
  mgmtKeyId = String(mgmtObj.id ?? "");
  if (!mgmtKey || !mgmtKeyId) {
    throw new Error("Management key response missing raw_key or id");
  }

  const inferResp = await requestJson(baseUrl, "/api/v1/tokenhall/keys", {
    method: "POST",
    headers: sessionHeaders,
    body: JSON.stringify({ name: `verify-infer-${runId}`, is_management_key: false, rate_limit_rpm: 120 }),
  });
  if (inferResp.status !== 201) {
    throw new Error(`Failed to create inference key (${inferResp.status}): ${inferResp.text}`);
  }
  const inferObj = toObj(toObj(inferResp.data).key);
  inferKey = String(inferObj.raw_key ?? "");
  inferKeyId = String(inferObj.id ?? "");
  if (!inferKey || !inferKeyId) {
    throw new Error("Inference key response missing raw_key or id");
  }
  checks.push({ name: "tokenhall key creation", ok: true });

  // 6) Save OpenRouter BYOK on test agent (preferred path for this verification).
  if (openrouterApiKey) {
    const providerCreate = await requestJson(baseUrl, "/api/v1/tokenhall/provider-keys", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${mgmtKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        provider: "openrouter",
        key: openrouterApiKey,
        label: `verify-openrouter-${runId}`,
        scope: "agent",
      }),
    });

    if (providerCreate.status !== 201 && providerCreate.status !== 200) {
      throw new Error(`Failed to save OpenRouter provider key (${providerCreate.status}): ${providerCreate.text}`);
    }

    providerKeyId = String(toObj(providerCreate.data).key && toObj(toObj(providerCreate.data).key).id);
    checks.push({ name: "store OpenRouter BYOK for agent", ok: true });
  } else {
    checks.push({
      name: "store OpenRouter BYOK for agent",
      ok: false,
      details: "Skipped: OPENROUTER_API_KEY missing (will rely on platform default if configured)",
    });
  }

  // 7) Basic TokenHall endpoint checks with inference key.
  const modelsRes = await requestJson(baseUrl, "/api/v1/tokenhall/models", {
    method: "GET",
    headers: { Authorization: `Bearer ${inferKey}` },
  });
  const modelList = Array.isArray(toObj(modelsRes.data).models) ? (toObj(modelsRes.data).models as unknown[]) : [];
  checks.push({
    name: "tokenhall models endpoint authenticated",
    ok: modelsRes.status === 200 && Array.isArray(modelList),
    details: `status=${modelsRes.status}, models=${modelList.length}`,
  });
  if (modelsRes.status !== 200) {
    throw new Error(`Models endpoint failed (${modelsRes.status}): ${modelsRes.text}`);
  }

  const creditsRes = await requestJson(baseUrl, "/api/v1/tokenhall/credits", {
    method: "GET",
    headers: { Authorization: `Bearer ${inferKey}` },
  });
  checks.push({
    name: "tokenhall credits endpoint",
    ok: creditsRes.status === 200,
    details: `status=${creditsRes.status}`,
  });

  // 8) Non-streaming chat completion compatibility check.
  let successModel: string | null = null;
  let nonStreamObjectOk = false;

  for (const model of TEST_MODELS) {
    const chat = await requestJson(baseUrl, "/api/v1/tokenhall/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${inferKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        stream: false,
        temperature: 0,
        max_tokens: 80,
        messages: [
          { role: "system", content: "Return one short sentence." },
          { role: "user", content: "Say hello from TokenMart verification." },
        ],
      }),
    });

    if (chat.status === 200) {
      const body = toObj(chat.data);
      const choices = Array.isArray(body.choices) ? body.choices : [];
      const usage = body.usage && typeof body.usage === "object" ? (body.usage as Json) : null;
      nonStreamObjectOk = body.object === "chat.completion" && choices.length > 0 && usage !== null;
      if (nonStreamObjectOk) {
        successModel = model;
        break;
      }
    }
  }

  checks.push({
    name: "openrouter-routed non-stream response shape",
    ok: nonStreamObjectOk,
    details: successModel ? `model=${successModel}` : "No candidate model returned a valid 200 response",
  });
  if (!successModel || !nonStreamObjectOk) {
    throw new Error("Failed to get a valid non-stream OpenRouter-routed response from /chat/completions");
  }

  // 9) Streaming SSE verification.
  const streamRes = await fetch(`${baseUrl}/api/v1/tokenhall/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${inferKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: successModel,
      stream: true,
      temperature: 0,
      max_tokens: 120,
      messages: [
        { role: "system", content: "Respond in <= 2 short sentences." },
        { role: "user", content: "Explain what SSE streaming means in plain English." },
      ],
    }),
  });

  const contentType = getHeader(streamRes.headers, "content-type");
  if (streamRes.status !== 200) {
    const body = await streamRes.text();
    throw new Error(`Streaming request failed (${streamRes.status}): ${body}`);
  }

  const sse = await parseSseStream(streamRes);
  const streamOk =
    contentType.includes("text/event-stream") &&
    sse.doneSeen &&
    sse.chunksSeen > 0 &&
    sse.assembledText.trim().length > 0;

  checks.push({
    name: "chat/completions stream SSE contract",
    ok: streamOk,
    details: `content-type=${contentType}, chunks=${sse.chunksSeen}, done=${sse.doneSeen}, usageSeen=${sse.usageSeen}`,
  });

  if (!streamOk) {
    throw new Error("Streaming SSE validation failed");
  }

  // 10) Cleanup temporary keys.
  const cleanupHeaders = {
    Authorization: `Bearer ${sessionToken}`,
    "X-Agent-Id": agentId,
  };

  if (providerKeyId) {
    await requestJson(baseUrl, `/api/v1/tokenhall/provider-keys/${providerKeyId}`, {
      method: "DELETE",
      headers: cleanupHeaders,
    });
  }

  if (inferKeyId) {
    await requestJson(baseUrl, `/api/v1/tokenhall/keys/${inferKeyId}`, {
      method: "DELETE",
      headers: cleanupHeaders,
    });
  }

  if (mgmtKeyId) {
    await requestJson(baseUrl, `/api/v1/tokenhall/keys/${mgmtKeyId}`, {
      method: "DELETE",
      headers: cleanupHeaders,
    });
  }

  checks.push({ name: "cleanup temporary keys", ok: true });

  // Summary.
  console.log("\nVerification Summary:");
  for (const check of checks) {
    console.log(`- ${check.ok ? "PASS" : "FAIL"} ${check.name}${check.details ? ` :: ${check.details}` : ""}`);
  }

  const failed = checks.filter((c) => !c.ok && !c.details?.startsWith("Skipped:"));
  if (failed.length > 0) {
    throw new Error(`Verification had ${failed.length} failed checks`);
  }

  console.log("\nTokenHall production verification passed.");
}

run().catch((err) => {
  console.error(`\nVerification failed: ${err instanceof Error ? err.message : String(err)}`);
  process.exit(1);
});
