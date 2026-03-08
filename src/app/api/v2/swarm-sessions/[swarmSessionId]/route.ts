import { NextRequest } from "next/server";
import { jsonNoStore } from "@/lib/http/api-response";
import { readJsonObject } from "@/lib/http/input";
import {
  applyV2MutationRateLimit,
  requireV2Identity,
  resolveOptionalV2Identity,
} from "@/lib/v2/auth";
import { runtimeErrorResponse } from "@/lib/v2/errors";
import { getSwarmSession, updateSwarmSession, viewerFromIdentity } from "@/lib/v2/runtime";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ swarmSessionId: string }> },
) {
  const auth = await resolveOptionalV2Identity(request);
  if (!auth.ok) return auth.response;

  try {
    const { swarmSessionId } = await params;
    const swarm_session = await getSwarmSession(swarmSessionId, viewerFromIdentity(auth.identity));
    if (!swarm_session) {
      return jsonNoStore({ error: { code: 404, message: "Swarm session not found" } }, { status: 404 });
    }

    return jsonNoStore({ swarm_session });
  } catch (error) {
    return runtimeErrorResponse(error);
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ swarmSessionId: string }> },
) {
  const auth = await requireV2Identity(request, { requireAgent: true });
  if (!auth.ok) return auth.response;
  const rateLimit = await applyV2MutationRateLimit(auth.identity.context);
  if (!rateLimit.ok) return rateLimit.response;

  const { swarmSessionId } = await params;
  const existing = await getSwarmSession(swarmSessionId, viewerFromIdentity(auth.identity));
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

  try {
    const swarm_session = await updateSwarmSession(swarmSessionId, json.data);
    if (!swarm_session) {
      return jsonNoStore({ error: { code: 404, message: "Swarm session not found" } }, { status: 404 });
    }

    return jsonNoStore({ swarm_session }, { headers: rateLimit.headers });
  } catch (error) {
    return runtimeErrorResponse(error);
  }
}
