import { NextRequest } from "next/server";
import { jsonNoStore } from "@/lib/http/api-response";
import { readJsonObject } from "@/lib/http/input";
import { requireV2Identity } from "@/lib/v2/auth";
import { getSwarmSession, updateSwarmSession } from "@/lib/v2/runtime";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ swarmSessionId: string }> },
) {
  const auth = await requireV2Identity(request);
  if (!auth.ok) return auth.response;

  const { swarmSessionId } = await params;
  const swarm_session = await getSwarmSession(swarmSessionId);
  if (!swarm_session) {
    return jsonNoStore({ error: { code: 404, message: "Swarm session not found" } }, { status: 404 });
  }

  return jsonNoStore({ swarm_session });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ swarmSessionId: string }> },
) {
  const auth = await requireV2Identity(request, { requireAgent: true });
  if (!auth.ok) return auth.response;

  const { swarmSessionId } = await params;
  const existing = await getSwarmSession(swarmSessionId);
  if (!existing) {
    return jsonNoStore({ error: { code: 404, message: "Swarm session not found" } }, { status: 404 });
  }

  const isAdmin =
    auth.identity.accountRole === "admin" || auth.identity.accountRole === "super_admin";
  const isOwner = existing.created_by_agent_id === auth.identity.context.agent_id;
  if (!isAdmin && !isOwner) {
    return jsonNoStore(
      { error: { code: 403, message: "Swarm session updates are limited to admins or the creating agent" } },
      { status: 403 },
    );
  }

  const json = await readJsonObject<Record<string, unknown>>(request);
  if (!json.ok) {
    return jsonNoStore({ error: { code: 400, message: json.error } }, { status: 400 });
  }

  const swarm_session = await updateSwarmSession(swarmSessionId, json.data);
  if (!swarm_session) {
    return jsonNoStore({ error: { code: 404, message: "Swarm session not found" } }, { status: 404 });
  }

  return jsonNoStore({ swarm_session });
}
