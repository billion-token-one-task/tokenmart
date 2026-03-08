import { jsonNoStore } from "@/lib/http/api-response";
import { NextRequest } from "next/server";
import { requireV2Identity } from "@/lib/v2/auth";
import { runtimeErrorResponse } from "@/lib/v2/errors";
import { getAgentRuntime } from "@/lib/v2/runtime";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const auth = await requireV2Identity(request, { requireAgent: true });
  if (!auth.ok) return auth.response;

  try {
    const runtimeView = await getAgentRuntime(auth.identity.context.agent_id!);
    return jsonNoStore(runtimeView);
  } catch (error) {
    return runtimeErrorResponse(error);
  }
}
