import { NextRequest } from "next/server";
import { jsonNoStore } from "@/lib/http/api-response";
import { readJsonObject } from "@/lib/http/input";
import { checkGlobalRateLimit, rateLimitResponse } from "@/lib/rate-limit";
import {
  readOpenClawSandboxSnapshot,
  startOpenClawSandboxRun,
} from "@/lib/openclaw/sandbox";
import type { OpenClawSandboxRunStartInput } from "@/lib/openclaw/sandbox-types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const rateLimit = await checkGlobalRateLimit(request);
  if (!rateLimit.allowed) return rateLimitResponse();

  try {
    return jsonNoStore(await readOpenClawSandboxSnapshot());
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load OpenClaw sandbox snapshot";
    return jsonNoStore({ error: { code: 500, message } }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const rateLimit = await checkGlobalRateLimit(request);
  if (!rateLimit.allowed) return rateLimitResponse();

  const json = await readJsonObject<OpenClawSandboxRunStartInput>(request);
  if (!json.ok) {
    return jsonNoStore({ error: { code: 400, message: json.error } }, { status: 400 });
  }

  try {
    const run = await startOpenClawSandboxRun(json.data);
    return jsonNoStore(run, {
      status: 202,
      headers: {
        Location: `/api/v3/openclaw/sandbox/runs/${run.id}`,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to start OpenClaw sandbox run";
    const status = /disabled/i.test(message)
      ? 403
      : /already in progress/i.test(message)
        ? 409
        : /required|scenario/i.test(message)
          ? 400
          : 500;
    return jsonNoStore({ error: { code: status, message } }, { status });
  }
}
