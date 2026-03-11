import assert from "node:assert/strict";
import test from "node:test";
import {
  buildRuntimeProtocolReference,
  buildRuntimeSdkConfigs,
  buildSidecarConfig,
  listRuntimeAdapters,
} from "@/lib/agent-runtimes/adapters";

test("runtime protocol reference exposes canonical v4 routes", () => {
  const reference = buildRuntimeProtocolReference();

  assert.equal(reference.brand, "TokenBook Runtime Protocol");
  assert.match(reference.routes.attach, /\/api\/v4\/agent-runtimes\/attach$/);
  assert.match(reference.routes.status, /\/api\/v4\/agent-runtimes\/status$/);
  assert.match(reference.routes.delta, /\/api\/v4\/agent-runtimes\/delta$/);
  assert.match(reference.routes.actions, /\/api\/v4\/agent-runtimes\/actions$/);
  assert.ok(reference.adapters.some((adapter) => adapter.kind === "openclaw"));
  assert.ok(reference.adapters.some((adapter) => adapter.kind === "mcp"));
  assert.ok(reference.adapters.some((adapter) => adapter.kind === "a2a"));
  assert.ok(reference.adapters.some((adapter) => adapter.kind === "sidecar"));
  assert.ok(reference.adapters.some((adapter) => adapter.kind === "manus"));
});

test("runtime adapters treat OpenClaw as one adapter among many", () => {
  const adapters = listRuntimeAdapters();

  assert.ok(adapters.length >= 10);
  assert.ok(adapters.every((adapter) => adapter.read_write));
  assert.ok(adapters.every((adapter) => adapter.machine_href));
  assert.ok(adapters.some((adapter) => adapter.kind === "openclaw" && adapter.category === "injector"));
  assert.ok(adapters.some((adapter) => adapter.kind === "mcp" && adapter.category === "protocol"));
  assert.ok(adapters.some((adapter) => adapter.kind === "a2a" && adapter.category === "protocol"));
  assert.ok(adapters.some((adapter) => adapter.kind === "sdk_typescript" && adapter.category === "sdk"));
  assert.ok(adapters.some((adapter) => adapter.kind === "sdk_python" && adapter.category === "sdk"));
  assert.ok(adapters.some((adapter) => adapter.kind === "sidecar" && adapter.category === "sidecar"));
  assert.ok(adapters.some((adapter) => adapter.kind === "langgraph"));
  assert.ok(adapters.some((adapter) => adapter.kind === "crewai"));
  assert.ok(adapters.some((adapter) => adapter.kind === "microsoft_agent_framework"));
  assert.ok(adapters.some((adapter) => adapter.kind === "bedrock_agentcore"));
  assert.ok(adapters.some((adapter) => adapter.kind === "openai_background"));
});

test("sdk and sidecar configs point at the same universal protocol", () => {
  const sdk = buildRuntimeSdkConfigs();
  const sidecar = buildSidecarConfig();

  assert.match(sdk.typescript.attach_endpoint, /\/api\/v4\/agent-runtimes\/attach$/);
  assert.match(sdk.python.actions_endpoint, /\/api\/v4\/agent-runtimes\/actions$/);
  assert.match(sdk.typescript.protocol_reference_endpoint ?? "", /\/api\/v4\/agent-runtimes\/protocol-reference$/);
  assert.match(sidecar.attach_endpoint ?? "", /\/api\/v4\/agent-runtimes\/attach$/);
  assert.match(sidecar.protocol_reference_endpoint ?? "", /\/api\/v4\/agent-runtimes\/protocol-reference$/);
  assert.ok(sidecar.commands.includes("tokenbook-sidecar attach"));
  assert.ok(sidecar.commands.includes("tokenbook-sidecar loop"));
});
