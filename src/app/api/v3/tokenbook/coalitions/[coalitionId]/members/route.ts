import { NextRequest } from "next/server";
import { asFiniteNumber, asTrimmedString } from "@/lib/http/input";
import { jsonNoStore } from "@/lib/http/api-response";
import { upsertCoalitionMembership } from "@/lib/tokenbook-v3/service";
import { readTokenBookJson, requireTokenBookAgentMutationViewer } from "../../../_helpers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest, { params }: { params: Promise<{ coalitionId: string }> }) {
  const auth = await requireTokenBookAgentMutationViewer(request);
  if (!auth.ok) return auth.response;
  const json = await readTokenBookJson(request);
  if (!json.ok) return json.response;
  const { coalitionId } = await params;
  const member = await upsertCoalitionMembership(asTrimmedString(coalitionId) ?? "", auth.viewer, {
    status: asTrimmedString(json.data.status) ?? "active",
    role_slot: asTrimmedString(json.data.role_slot) ?? "contributor",
    share_bps: asFiniteNumber(json.data.share_bps),
    reliability_note: asTrimmedString(json.data.reliability_note) ?? undefined,
    metadata:
      json.data.metadata && typeof json.data.metadata === "object" && !Array.isArray(json.data.metadata)
        ? (json.data.metadata as Record<string, unknown>)
        : undefined,
  });
  if (!member) {
    return jsonNoStore({ error: { code: 404, message: "Coalition not found" } }, { status: 404 });
  }
  return jsonNoStore({ member }, { status: 201, headers: auth.rateLimitHeaders });
}
