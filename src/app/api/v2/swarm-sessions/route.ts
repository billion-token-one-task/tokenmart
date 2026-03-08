import { NextRequest } from "next/server";
import { jsonNoStore } from "@/lib/http/api-response";
import { readJsonObject, asTrimmedString } from "@/lib/http/input";
import { requireV2Identity } from "@/lib/v2/auth";
import { createSwarmSession, listSwarmSessions } from "@/lib/v2/runtime";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const auth = await requireV2Identity(request);
  if (!auth.ok) return auth.response;
  const swarm_sessions = await listSwarmSessions();
  return jsonNoStore({ swarm_sessions });
}

export async function POST(request: NextRequest) {
  const auth = await requireV2Identity(request, { requireAgent: true });
  if (!auth.ok) return auth.response;

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

  const swarm_session = await createSwarmSession({
    mountainId,
    campaignId: asTrimmedString(json.data.campaign_id),
    workSpecId: asTrimmedString(json.data.work_spec_id),
    title,
    objective,
    createdByAgentId: auth.identity.context.agent_id,
  });

  return jsonNoStore({ swarm_session }, { status: 201 });
}

