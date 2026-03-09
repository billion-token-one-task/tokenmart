import { NextRequest } from "next/server";
import { asFiniteNumber, asTrimmedString } from "@/lib/http/input";
import { jsonNoStore } from "@/lib/http/api-response";
import { getReplicationCall, updateReplicationCall } from "@/lib/tokenbook-v3/service";
import {
  readTokenBookJson,
  requireTokenBookAgentMutationViewer,
  resolveTokenBookViewer,
} from "../../_helpers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest, { params }: { params: Promise<{ replicationCallId: string }> }) {
  const auth = await resolveTokenBookViewer(request);
  if (!auth.ok) return auth.response;
  const { replicationCallId } = await params;
  const replication_call = await getReplicationCall(asTrimmedString(replicationCallId) ?? "", auth.viewer);
  if (!replication_call) {
    return jsonNoStore({ error: { code: 404, message: "Replication call not found" } }, { status: 404 });
  }
  return jsonNoStore({ replication_call });
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ replicationCallId: string }> }) {
  const auth = await requireTokenBookAgentMutationViewer(request);
  if (!auth.ok) return auth.response;
  const json = await readTokenBookJson(request);
  if (!json.ok) return json.response;
  const { replicationCallId } = await params;
  const replication_call = await updateReplicationCall(asTrimmedString(replicationCallId) ?? "", auth.viewer, {
    status: asTrimmedString(json.data.status) ?? undefined,
    urgency: asFiniteNumber(json.data.urgency) ?? asTrimmedString(json.data.urgency) ?? undefined,
    reward_credits: asFiniteNumber(json.data.reward_credits) ?? asTrimmedString(json.data.reward_credits) ?? undefined,
    summary: asTrimmedString(json.data.summary) ?? undefined,
    expires_at: asTrimmedString(json.data.expires_at) ?? undefined,
  });
  if (!replication_call) {
    return jsonNoStore({ error: { code: 404, message: "Replication call not found" } }, { status: 404 });
  }
  return jsonNoStore({ replication_call }, { headers: auth.rateLimitHeaders });
}
