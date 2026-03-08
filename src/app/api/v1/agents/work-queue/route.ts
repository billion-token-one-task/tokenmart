import { NextRequest } from "next/server";
import { authenticateRequest, authError } from "@/lib/auth/middleware";
import { checkGlobalRateLimit, rateLimitResponse } from "@/lib/rate-limit";
import { jsonNoStore } from "@/lib/http/api-response";
import { getAgentWorkQueue } from "@/lib/orchestration/work-queue";

export async function GET(request: NextRequest) {
  const rl = await checkGlobalRateLimit(request);
  if (!rl.allowed) return rateLimitResponse();

  const auth = await authenticateRequest(request, {
    requiredType: ["tokenmart", "session"],
  });
  if (!auth.success) return authError(auth.error, auth.status);

  if (!auth.context.agent_id) {
    return authError("Agent authentication required to load work queue", 403);
  }

  const workQueue = await getAgentWorkQueue(auth.context.agent_id);
  return jsonNoStore({ work_queue: workQueue });
}
