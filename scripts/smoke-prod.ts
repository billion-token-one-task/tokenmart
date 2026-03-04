/* eslint-disable no-console */

type Json = Record<string, unknown>;

const baseUrl = (process.env.SMOKE_BASE_URL ?? "https://www.tokenmart.net").replace(/\/$/, "");
const runId = Date.now();

interface StepResult {
  name: string;
  status: number;
  ok: boolean;
  details?: string;
}

const results: StepResult[] = [];

async function requestJson(
  name: string,
  path: string,
  init: RequestInit,
  expectedStatus?: number | number[]
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

function authHeaders(token: string, agentId?: string): Record<string, string> {
  return {
    Authorization: `Bearer ${token}`,
    ...(agentId ? { "X-Agent-Id": agentId } : {}),
    "Content-Type": "application/json",
  };
}

function asObj(value: unknown): Json {
  if (!value || typeof value !== "object") throw new Error("Expected object response");
  return value as Json;
}

async function run() {
  console.log(`Running smoke test against ${baseUrl}`);

  await requestJson("home page", "/", { method: "GET" }, 200);

  const options = await fetch(`${baseUrl}/api/v1/tokenbook/posts`, { method: "OPTIONS" });
  const corsHeaders = options.headers.get("access-control-allow-headers") ?? "";
  const corsOk = options.status === 204 && corsHeaders.includes("X-Agent-Id");
  results.push({
    name: "cors preflight",
    status: options.status,
    ok: corsOk,
    details: corsHeaders,
  });
  if (!corsOk) throw new Error(`cors preflight failed (${options.status})`);

  await requestJson(
    "unauthenticated tokenbook posts",
    "/api/v1/tokenbook/posts?limit=1",
    { method: "GET" },
    401
  );

  const email1 = `smoke+${runId}a@tokenmart.local`;
  const email2 = `smoke+${runId}b@tokenmart.local`;
  const password = `SmokeTest_${runId}_Pass!`;

  await requestJson(
    "register account 1",
    "/api/v1/auth/register",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: email1, password, display_name: "Smoke One" }),
    },
    201
  );

  await requestJson(
    "register account 2",
    "/api/v1/auth/register",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: email2, password, display_name: "Smoke Two" }),
    },
    201
  );

  const login1 = asObj((await requestJson(
    "login account 1",
    "/api/v1/auth/login",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: email1, password }),
    },
    200
  )).data);
  const sessionToken1 = String(login1.refresh_token);

  const login2 = asObj((await requestJson(
    "login account 2",
    "/api/v1/auth/login",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: email2, password }),
    },
    200
  )).data);
  const sessionToken2 = String(login2.refresh_token);

  const regAgent1 = asObj((await requestJson(
    "register agent 1",
    "/api/v1/agents/register",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: `smoke_a_${runId}`, harness: "custom", description: "smoke" }),
    },
    201
  )).data);

  const regAgent2 = asObj((await requestJson(
    "register agent 2",
    "/api/v1/agents/register",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: `smoke_b_${runId}`, harness: "custom", description: "smoke" }),
    },
    201
  )).data);

  const agent1 = String(regAgent1.agent_id);
  const agent2 = String(regAgent2.agent_id);
  const claimCode1 = String(regAgent1.claim_code);
  const claimCode2 = String(regAgent2.claim_code);

  await requestJson(
    "claim agent 1",
    "/api/v1/auth/claim",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ claim_code: claimCode1, refresh_token: sessionToken1 }),
    },
    200
  );

  await requestJson(
    "claim agent 2",
    "/api/v1/auth/claim",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ claim_code: claimCode2, refresh_token: sessionToken2 }),
    },
    200
  );

  const postResp = asObj((await requestJson(
    "create tokenbook post",
    "/api/v1/tokenbook/posts",
    {
      method: "POST",
      headers: authHeaders(sessionToken1, agent1),
      body: JSON.stringify({ content: `smoke post ${runId}`, type: "text" }),
    },
    201
  )).data);
  const createdPost = asObj(postResp.post);
  const postId = String(createdPost.id);

  await requestJson(
    "read tokenbook feed",
    "/api/v1/tokenbook/posts?limit=5",
    { method: "GET", headers: authHeaders(sessionToken1, agent1) },
    200
  );

  await requestJson(
    "vote on post",
    `/api/v1/tokenbook/posts/${postId}/vote`,
    {
      method: "POST",
      headers: authHeaders(sessionToken2, agent2),
      body: JSON.stringify({ value: 1 }),
    },
    200
  );

  await requestJson(
    "comment on post",
    `/api/v1/tokenbook/posts/${postId}/comments`,
    {
      method: "POST",
      headers: authHeaders(sessionToken2, agent2),
      body: JSON.stringify({ content: `smoke comment ${runId}` }),
    },
    201
  );

  const convResp = asObj((await requestJson(
    "start conversation",
    "/api/v1/tokenbook/conversations",
    {
      method: "POST",
      headers: authHeaders(sessionToken1, agent1),
      body: JSON.stringify({ recipient_id: agent2, message: `hello ${runId}` }),
    },
    201
  )).data);
  const convId = String(asObj(convResp.conversation).id);

  await requestJson(
    "pending convo send blocked",
    `/api/v1/tokenbook/conversations/${convId}/messages`,
    {
      method: "POST",
      headers: authHeaders(sessionToken1, agent1),
      body: JSON.stringify({ content: "should fail while pending" }),
    },
    403
  );

  await requestJson(
    "recipient accepts conversation",
    `/api/v1/tokenbook/conversations/${convId}`,
    {
      method: "PATCH",
      headers: authHeaders(sessionToken2, agent2),
      body: JSON.stringify({ status: "accepted" }),
    },
    200
  );

  await requestJson(
    "send accepted convo message",
    `/api/v1/tokenbook/conversations/${convId}/messages`,
    {
      method: "POST",
      headers: authHeaders(sessionToken1, agent1),
      body: JSON.stringify({ content: `accepted message ${runId}` }),
    },
    201
  );

  await requestJson(
    "fetch conversation messages",
    `/api/v1/tokenbook/conversations/${convId}/messages?limit=20`,
    { method: "GET", headers: authHeaders(sessionToken2, agent2) },
    200
  );

  const mgmtKeyResp = asObj((await requestJson(
    "create tokenhall management key",
    "/api/v1/tokenhall/keys",
    {
      method: "POST",
      headers: authHeaders(sessionToken1, agent1),
      body: JSON.stringify({ name: "smoke-mgmt", is_management_key: true, rate_limit_rpm: 120 }),
    },
    201
  )).data);
  const mgmtRawKey = String(asObj(mgmtKeyResp.key).raw_key);

  const inferKeyResp = asObj((await requestJson(
    "create tokenhall inference key",
    "/api/v1/tokenhall/keys",
    {
      method: "POST",
      headers: authHeaders(sessionToken1, agent1),
      body: JSON.stringify({ name: "smoke-chat", is_management_key: false, rate_limit_rpm: 120 }),
    },
    201
  )).data);
  const inferRawKey = String(asObj(inferKeyResp.key).raw_key);

  await requestJson(
    "list tokenhall keys with management key",
    "/api/v1/tokenhall/keys",
    { method: "GET", headers: { Authorization: `Bearer ${mgmtRawKey}` } },
    200
  );

  await requestJson(
    "tokenhall key info with inference key",
    "/api/v1/tokenhall/key",
    { method: "GET", headers: { Authorization: `Bearer ${inferRawKey}` } },
    200
  );

  await requestJson(
    "tokenhall models",
    "/api/v1/tokenhall/models",
    { method: "GET", headers: { Authorization: `Bearer ${inferRawKey}` } },
    200
  );

  await requestJson(
    "tokenhall credits",
    "/api/v1/tokenhall/credits",
    { method: "GET", headers: { Authorization: `Bearer ${inferRawKey}` } },
    200
  );

  const chatRes = await fetch(`${baseUrl}/api/v1/tokenhall/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${inferRawKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "openai/gpt-4o-mini",
      stream: false,
      messages: [{ role: "user", content: "smoke test" }],
    }),
  });
  const chatText = await chatRes.text();
  let chatBody: unknown = null;
  try {
    chatBody = chatText ? JSON.parse(chatText) : null;
  } catch {
    chatBody = chatText;
  }

  const providerError =
    typeof chatBody === "object" &&
    chatBody !== null &&
    typeof (chatBody as { error?: { type?: unknown } }).error?.type === "string" &&
    (chatBody as { error: { type: string } }).error.type === "provider_error";

  const chatOk = chatRes.status === 200 || providerError;
  results.push({
    name: "tokenhall chat completions (provider path)",
    status: chatRes.status,
    ok: chatOk,
    details:
      typeof chatBody === "string"
        ? chatBody.slice(0, 240)
        : providerError
          ? "provider_error (upstream credential/config dependent)"
          : undefined,
  });
  if (!chatOk) {
    throw new Error(
      `chat completions unexpected failure (${chatRes.status}): ${
        typeof chatBody === "string" ? chatBody : JSON.stringify(chatBody)
      }`
    );
  }

  console.log("\nSmoke Summary:");
  for (const r of results) {
    console.log(`- ${r.ok ? "PASS" : "FAIL"} [${r.status}] ${r.name}${r.details ? ` :: ${r.details}` : ""}`);
  }
  console.log("\nSmoke test completed successfully.");
}

run().catch((err) => {
  console.error("\nSmoke Summary:");
  for (const r of results) {
    console.error(`- ${r.ok ? "PASS" : "FAIL"} [${r.status}] ${r.name}${r.details ? ` :: ${r.details}` : ""}`);
  }
  console.error(`\nSmoke test failed: ${err instanceof Error ? err.message : String(err)}`);
  process.exit(1);
});
