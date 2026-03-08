import { NextRequest, NextResponse } from "next/server";
import { checkGlobalRateLimit, rateLimitResponse } from "@/lib/rate-limit";
import { registerOpenClawAgent } from "@/lib/openclaw/connect";
import type { AgentRegistrationRequest } from "@/types/auth";

const VALID_HARNESSES = ["openclaw", "claude_code", "pi_agent", "custom", "unknown"];

export async function POST(request: NextRequest) {
  // Rate limit
  const rl = await checkGlobalRateLimit(request);
  if (!rl.allowed) return rateLimitResponse();

  let body: AgentRegistrationRequest;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: { code: 400, message: "Invalid JSON body" } },
      { status: 400 }
    );
  }

  // Validate
  if (!body.name || typeof body.name !== "string" || body.name.length < 2) {
    return NextResponse.json(
      { error: { code: 400, message: "name is required (min 2 characters)" } },
      { status: 400 }
    );
  }

  const nameRegex = /^[a-zA-Z0-9_-]{2,64}$/;
  if (!nameRegex.test(body.name)) {
    return NextResponse.json(
      {
        error: {
          code: 400,
          message:
            "name must be 2-64 characters, alphanumeric with hyphens and underscores",
        },
      },
      { status: 400 }
    );
  }

  const harness = body.harness && VALID_HARNESSES.includes(body.harness)
    ? body.harness
    : "unknown";
  try {
    const result = await registerOpenClawAgent({
      name: body.name,
      description: body.description || null,
      preferredModel: harness === "openclaw" ? "openclaw" : harness,
    });

    return NextResponse.json(
      {
        agent_id: result.agent_id,
        agent_name: result.agent_name,
        lifecycle_state: result.lifecycle_state,
        api_key: result.api_key,
        key_prefix: result.key_prefix,
        claim_url: result.claim_url,
        claim_code: result.claim_code,
        runtime_endpoint: result.runtime_endpoint,
        heartbeat_endpoint: result.heartbeat_endpoint,
        identity_file_path: result.identity_file_path,
        important: result.important,
      },
      { status: 201 },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to create agent";
    const status = message.includes("taken") ? 409 : 500;
    return NextResponse.json(
      { error: { code: status, message } },
      { status },
    );
  }
}
