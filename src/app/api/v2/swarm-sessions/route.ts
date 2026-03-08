import { NextRequest } from "next/server";
import { jsonNoStore } from "@/lib/http/api-response";
import { readJsonObject, asTrimmedString } from "@/lib/http/input";
import { applyV2MutationRateLimit, requireV2Identity, resolveOptionalV2Identity } from "@/lib/v2/auth";
import { runtimeErrorResponse } from "@/lib/v2/errors";
import { createSwarmSession, listSwarmSessions, viewerFromIdentity } from "@/lib/v2/runtime";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const auth = await resolveOptionalV2Identity(request);
  if (!auth.ok) return auth.response;
  try {
    const swarm_sessions = await listSwarmSessions(viewerFromIdentity(auth.identity));
    return jsonNoStore({ swarm_sessions });
  } catch (error) {
    return runtimeErrorResponse(error);
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireV2Identity(request, { requireAgent: true });
  if (!auth.ok) return auth.response;
  const rateLimit = await applyV2MutationRateLimit(auth.identity.context);
  if (!rateLimit.ok) return rateLimit.response;

  const json = await readJsonObject<Record<string, unknown>>(request);
  if (!json.ok) {
    return jsonNoStore({ error: { code: 400, message: json.error } }, { status: 400 });
  }

  const mountainId = asTrimmedString(json.data.mountain_id);
  const title = asTrimmedString(json.data.title);
  const objective = asTrimmedString(json.data.objective);
  if (!mountainId || !title || !objective) {
    return jsonNoStore(
      { error: { code: 400, message: "mountain_id, title, and objective are required" } },
      { status: 400 }
    );
  }

  try {
    const swarm_session = await createSwarmSession({
      mountainId,
      campaignId: asTrimmedString(json.data.campaign_id),
      workSpecId: asTrimmedString(json.data.work_spec_id),
      title,
      objective,
      createdByAgentId: auth.identity.context.agent_id,
    });

    return jsonNoStore({ swarm_session }, { status: 201, headers: rateLimit.headers });
  } catch (error) {
    return runtimeErrorResponse(error);
  }
}
