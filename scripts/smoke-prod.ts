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
  const email3 = `smoke+${runId}c@tokenmart.local`;
  const password = `SmokeTest_${runId}_Pass!`;
  const agentName1 = `smoke_a_${runId}`;
  const agentName2 = `smoke_b_${runId}`;
  const agentName3 = `smoke_c_${runId}`;

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

  await requestJson(
    "register account duplicate conflict",
    "/api/v1/auth/register",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: email1, password, display_name: "Smoke One Duplicate" }),
    },
    409
  );

  await requestJson(
    "register account 3",
    "/api/v1/auth/register",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: email3, password, display_name: "Smoke Three" }),
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

  const login3 = asObj((await requestJson(
    "login account 3",
    "/api/v1/auth/login",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: email3, password }),
    },
    200
  )).data);
  const sessionToken3 = String(login3.refresh_token);

  const regAgent1 = asObj((await requestJson(
    "register agent 1",
    "/api/v1/agents/register",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: agentName1, harness: "custom", description: "smoke" }),
    },
    201
  )).data);

  const regAgent2 = asObj((await requestJson(
    "register agent 2",
    "/api/v1/agents/register",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: agentName2, harness: "custom", description: "smoke" }),
    },
    201
  )).data);

  const regAgent3 = asObj((await requestJson(
    "register agent 3",
    "/api/v1/agents/register",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: agentName3, harness: "custom", description: "smoke" }),
    },
    201
  )).data);

  await requestJson(
    "register agent duplicate conflict",
    "/api/v1/agents/register",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: agentName1, harness: "custom", description: "duplicate" }),
    },
    409
  );

  const claimUrl1 = String(regAgent1.claim_url ?? "");
  const claimUrl2 = String(regAgent2.claim_url ?? "");
  const claimUrl3 = String(regAgent3.claim_url ?? "");
  const queryStyleClaimUrl =
    claimUrl1.includes("/claim?code=") &&
    claimUrl2.includes("/claim?code=") &&
    claimUrl3.includes("/claim?code=");
  results.push({
    name: "agent registration claim_url uses query code",
    status: 200,
    ok: queryStyleClaimUrl,
    details: claimUrl1,
  });
  if (!queryStyleClaimUrl) {
    throw new Error(`claim_url format invalid: ${claimUrl1}`);
  }

  const agent1 = String(regAgent1.agent_id);
  const agent2 = String(regAgent2.agent_id);
  const agent3 = String(regAgent3.agent_id);
  const claimCode1 = String(regAgent1.claim_code);
  const claimCode2 = String(regAgent2.claim_code);
  const claimCode3 = String(regAgent3.claim_code);

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

  await requestJson(
    "claim agent 3",
    "/api/v1/auth/claim",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ claim_code: claimCode3, refresh_token: sessionToken3 }),
    },
    200
  );

  const agentSearch = asObj((await requestJson(
    "tokenbook search agents rpc path",
    `/api/v1/tokenbook/search?type=agents&q=${encodeURIComponent(agentName1)}&limit=5`,
    { method: "GET", headers: authHeaders(sessionToken1, agent1) },
    200
  )).data);
  const foundAgent1 = Array.isArray(agentSearch.agents) &&
    agentSearch.agents.some((item) => {
      const row = asObj(item as Json);
      return String(row.id) === agent1;
    });
  results.push({
    name: "tokenbook search contains created agent",
    status: 200,
    ok: foundAgent1,
  });
  if (!foundAgent1) {
    throw new Error("tokenbook search did not return the created agent");
  }

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

  const groupResp = asObj((await requestJson(
    "create tokenbook group",
    "/api/v1/tokenbook/groups",
    {
      method: "POST",
      headers: authHeaders(sessionToken1, agent1),
      body: JSON.stringify({
        name: `smoke-group-${runId}`,
        description: "group smoke",
        is_public: true,
        max_members: 2,
      }),
    },
    201
  )).data);
  const groupId = String(asObj(groupResp.group).id);

  await requestJson(
    "join group with second agent",
    `/api/v1/tokenbook/groups/${groupId}`,
    {
      method: "POST",
      headers: authHeaders(sessionToken2, agent2),
      body: JSON.stringify({ action: "join" }),
    },
    201
  );

  await requestJson(
    "group full blocks third agent",
    `/api/v1/tokenbook/groups/${groupId}`,
    {
      method: "POST",
      headers: authHeaders(sessionToken3, agent3),
      body: JSON.stringify({ action: "join" }),
    },
    409
  );

  await requestJson(
    "duplicate group membership blocked",
    `/api/v1/tokenbook/groups/${groupId}`,
    {
      method: "POST",
      headers: authHeaders(sessionToken2, agent2),
      body: JSON.stringify({ action: "join" }),
    },
    409
  );

  await requestJson(
    "leave group with second agent",
    `/api/v1/tokenbook/groups/${groupId}`,
    {
      method: "POST",
      headers: authHeaders(sessionToken2, agent2),
      body: JSON.stringify({ action: "leave" }),
    },
    200
  );

  await requestJson(
    "leave group second time blocked",
    `/api/v1/tokenbook/groups/${groupId}`,
    {
      method: "POST",
      headers: authHeaders(sessionToken2, agent2),
      body: JSON.stringify({ action: "leave" }),
    },
    404
  );

  await requestJson(
    "join group with third agent after free slot",
    `/api/v1/tokenbook/groups/${groupId}`,
    {
      method: "POST",
      headers: authHeaders(sessionToken3, agent3),
      body: JSON.stringify({ action: "join" }),
    },
    201
  );

  await requestJson(
    "group detail fetch",
    `/api/v1/tokenbook/groups/${groupId}`,
    {
      method: "GET",
      headers: authHeaders(sessionToken1, agent1),
    },
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
  const mgmtKeyObj = asObj(mgmtKeyResp.key);
  const mgmtRawKey = String(mgmtKeyObj.raw_key);

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
  const inferKeyObj = asObj(inferKeyResp.key);
  const inferRawKey = String(inferKeyObj.raw_key);
  const inferKeyId = String(inferKeyObj.id);

  await requestJson(
    "tokenhall key detail endpoint by id",
    `/api/v1/tokenhall/keys/${inferKeyId}`,
    { method: "GET", headers: { Authorization: `Bearer ${mgmtRawKey}` } },
    200
  );

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

  const providerCreate = asObj((await requestJson(
    "create provider key (agent scope)",
    "/api/v1/tokenhall/provider-keys",
    {
      method: "POST",
      headers: { Authorization: `Bearer ${mgmtRawKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        provider: "openai",
        key: `sk-smoke-${runId}-v1`,
        label: "smoke-openai",
        scope: "agent",
      }),
    },
    201
  )).data);
  const providerKeyId = String(asObj(providerCreate.key).id);

  const providerUpdate = asObj((await requestJson(
    "update existing provider key conflict path",
    "/api/v1/tokenhall/provider-keys",
    {
      method: "POST",
      headers: { Authorization: `Bearer ${mgmtRawKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        provider: "openai",
        key: `sk-smoke-${runId}-v2`,
        label: "smoke-openai-updated",
        scope: "agent",
      }),
    },
    200
  )).data);
  const providerUpdated = providerUpdate.updated === true;
  results.push({
    name: "provider key conflict path reports updated=true",
    status: 200,
    ok: providerUpdated,
  });
  if (!providerUpdated) {
    throw new Error("provider key upsert did not report updated=true");
  }

  const providerList = asObj((await requestJson(
    "list provider keys",
    "/api/v1/tokenhall/provider-keys",
    {
      method: "GET",
      headers: { Authorization: `Bearer ${mgmtRawKey}` },
    },
    200
  )).data);
  const openaiScopedCount = Array.isArray(providerList.keys)
    ? providerList.keys.filter((row) => {
        const key = asObj(row as Json);
        return String(key.provider) === "openai" && String(key.scope) === "agent";
      }).length
    : 0;
  results.push({
    name: "provider key uniqueness (single scoped row)",
    status: 200,
    ok: openaiScopedCount === 1,
    details: `count=${openaiScopedCount}`,
  });
  if (openaiScopedCount !== 1) {
    throw new Error(`expected exactly one openai agent-scoped provider key, got ${openaiScopedCount}`);
  }

  await requestJson(
    "delete provider key",
    `/api/v1/tokenhall/provider-keys/${providerKeyId}`,
    {
      method: "DELETE",
      headers: { Authorization: `Bearer ${mgmtRawKey}` },
    },
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

  const strictKeyResp = asObj((await requestJson(
    "create strict rpm inference key",
    "/api/v1/tokenhall/keys",
    {
      method: "POST",
      headers: authHeaders(sessionToken1, agent1),
      body: JSON.stringify({ name: "smoke-rpm1", is_management_key: false, rate_limit_rpm: 1 }),
    },
    201
  )).data);
  const strictRawKey = String(asObj(strictKeyResp.key).raw_key);

  const strictAttempt1 = await fetch(`${baseUrl}/api/v1/tokenhall/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${strictRawKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "openai/gpt-4o-mini",
      stream: false,
      messages: [{ role: "user", content: "strict key first request" }],
    }),
  });
  const strictAttempt1Body = await strictAttempt1.text();
  const strictAttempt1Ok = strictAttempt1.status === 200 || strictAttempt1.status >= 400;
  results.push({
    name: "strict key first chat request",
    status: strictAttempt1.status,
    ok: strictAttempt1Ok,
    details: strictAttempt1Body.slice(0, 160),
  });
  if (!strictAttempt1Ok) {
    throw new Error(`unexpected first strict key response: ${strictAttempt1.status}`);
  }

  const strictAttempt2 = await fetch(`${baseUrl}/api/v1/tokenhall/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${strictRawKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "openai/gpt-4o-mini",
      stream: false,
      messages: [{ role: "user", content: "strict key second request" }],
    }),
  });
  const strictText2 = await strictAttempt2.text();
  let strictBody2: unknown = null;
  try {
    strictBody2 = strictText2 ? JSON.parse(strictText2) : null;
  } catch {
    strictBody2 = strictText2;
  }
  const strictType = typeof strictBody2 === "object" && strictBody2 !== null
    ? asObj(asObj(strictBody2).error).type
    : null;
  const strict429Ok = strictAttempt2.status === 429 && strictType === "rate_limit_error";
  results.push({
    name: "tokenhall rate-limit 429 shape",
    status: strictAttempt2.status,
    ok: strict429Ok,
    details: typeof strictBody2 === "string" ? strictBody2.slice(0, 160) : JSON.stringify(strictBody2).slice(0, 160),
  });
  if (!strict429Ok) {
    throw new Error(`expected OpenAI-style 429 rate_limit_error, got ${strictAttempt2.status}: ${strictText2}`);
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
