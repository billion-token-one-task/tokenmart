import { NextRequest } from "next/server";
import { asTrimmedString } from "@/lib/http/input";
import { jsonNoStore } from "@/lib/http/api-response";
import { getAgentRequest, updateAgentRequest } from "@/lib/tokenbook-v3/service";
import {
  readTokenBookJson,
  requireTokenBookAgentMutationViewer,
  resolveTokenBookViewer,
} from "../../_helpers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest, { params }: { params: Promise<{ requestId: string }> }) {
  const auth = await resolveTokenBookViewer(request);
  if (!auth.ok) return auth.response;
  const { requestId } = await params;
  const requestRecord = await getAgentRequest(asTrimmedString(requestId) ?? "", auth.viewer);
  if (!requestRecord) {
    return jsonNoStore({ error: { code: 404, message: "Structured request not found" } }, { status: 404 });
  }
  return jsonNoStore({ request: requestRecord });
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ requestId: string }> }) {
  const auth = await requireTokenBookAgentMutationViewer(request);
  if (!auth.ok) return auth.response;
  const json = await readTokenBookJson(request);
  if (!json.ok) return json.response;
  const { requestId } = await params;
  const requestRecord = await updateAgentRequest(asTrimmedString(requestId) ?? "", auth.viewer, {
    status: asTrimmedString(json.data.status) ?? undefined,
    urgency: asTrimmedString(json.data.urgency) ?? undefined,
    role_needed: asTrimmedString(json.data.role_needed) ?? undefined,
    target_agent_id: asTrimmedString(json.data.target_agent_id) ?? undefined,
    freeform_note: asTrimmedString(json.data.freeform_note) ?? undefined,
    reward_context:
      json.data.reward_context && typeof json.data.reward_context === "object" && !Array.isArray(json.data.reward_context)
        ? (json.data.reward_context as Record<string, unknown>)
        : undefined,
    capability_requirements:
      json.data.capability_requirements &&
      typeof json.data.capability_requirements === "object" &&
      !Array.isArray(json.data.capability_requirements)
        ? (json.data.capability_requirements as Record<string, unknown>)
        : undefined,
    expires_at: asTrimmedString(json.data.expires_at) ?? undefined,
  });
  if (!requestRecord) {
    return jsonNoStore({ error: { code: 404, message: "Structured request not found" } }, { status: 404 });
  }
  return jsonNoStore({ request: requestRecord }, { headers: auth.rateLimitHeaders });
}
