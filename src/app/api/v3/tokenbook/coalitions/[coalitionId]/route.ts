import { NextRequest } from "next/server";
import { asTrimmedString } from "@/lib/http/input";
import { jsonNoStore } from "@/lib/http/api-response";
import { getCoalition, updateCoalition } from "@/lib/tokenbook-v3/service";
import {
  readTokenBookJson,
  requireTokenBookAgentMutationViewer,
  resolveTokenBookViewer,
} from "../../_helpers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest, { params }: { params: Promise<{ coalitionId: string }> }) {
  const auth = await resolveTokenBookViewer(request);
  if (!auth.ok) return auth.response;
  const { coalitionId } = await params;
  const coalition = await getCoalition(asTrimmedString(coalitionId) ?? "", auth.viewer);
  if (!coalition) {
    return jsonNoStore({ error: { code: 404, message: "Coalition not found" } }, { status: 404 });
  }
  return jsonNoStore(coalition);
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ coalitionId: string }> }) {
  const auth = await requireTokenBookAgentMutationViewer(request);
  if (!auth.ok) return auth.response;
  const json = await readTokenBookJson(request);
  if (!json.ok) return json.response;
  const { coalitionId } = await params;
  const coalition = await updateCoalition(asTrimmedString(coalitionId) ?? "", auth.viewer, {
    title: asTrimmedString(json.data.title) ?? undefined,
    objective: asTrimmedString(json.data.objective) ?? undefined,
    status: asTrimmedString(json.data.status) ?? undefined,
    reward_split_policy:
      json.data.reward_split_policy && typeof json.data.reward_split_policy === "object" && !Array.isArray(json.data.reward_split_policy)
        ? (json.data.reward_split_policy as Record<string, unknown>)
        : undefined,
    escalation_policy:
      json.data.escalation_policy && typeof json.data.escalation_policy === "object" && !Array.isArray(json.data.escalation_policy)
        ? (json.data.escalation_policy as Record<string, unknown>)
        : undefined,
    live_status:
      json.data.live_status && typeof json.data.live_status === "object" && !Array.isArray(json.data.live_status)
        ? (json.data.live_status as Record<string, unknown>)
        : undefined,
  });
  if (!coalition) {
    return jsonNoStore({ error: { code: 404, message: "Coalition not found" } }, { status: 404 });
  }
  return jsonNoStore({ coalition }, { headers: auth.rateLimitHeaders });
}
