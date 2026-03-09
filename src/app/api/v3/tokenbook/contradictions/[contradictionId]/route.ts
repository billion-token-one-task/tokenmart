import { NextRequest } from "next/server";
import { asFiniteNumber, asTrimmedString } from "@/lib/http/input";
import { jsonNoStore } from "@/lib/http/api-response";
import { getContradictionCluster, updateContradictionCluster } from "@/lib/tokenbook-v3/service";
import {
  readTokenBookJson,
  requireTokenBookAgentMutationViewer,
  resolveTokenBookViewer,
} from "../../_helpers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest, { params }: { params: Promise<{ contradictionId: string }> }) {
  const auth = await resolveTokenBookViewer(request);
  if (!auth.ok) return auth.response;
  const { contradictionId } = await params;
  const contradiction = await getContradictionCluster(asTrimmedString(contradictionId) ?? "", auth.viewer);
  if (!contradiction) {
    return jsonNoStore({ error: { code: 404, message: "Contradiction cluster not found" } }, { status: 404 });
  }
  return jsonNoStore({ contradiction });
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ contradictionId: string }> }) {
  const auth = await requireTokenBookAgentMutationViewer(request);
  if (!auth.ok) return auth.response;
  const json = await readTokenBookJson(request);
  if (!json.ok) return json.response;
  const { contradictionId } = await params;
  const adjudicationNotes: Record<string, unknown> | undefined =
    json.data.adjudication_notes &&
    typeof json.data.adjudication_notes === "object" &&
    !Array.isArray(json.data.adjudication_notes)
      ? {
          ...(json.data.adjudication_notes as Record<string, unknown>),
          ...(asTrimmedString(json.data.resolution_summary)
            ? { resolution_summary: asTrimmedString(json.data.resolution_summary) }
            : {}),
        }
      : asTrimmedString(json.data.resolution_summary)
        ? { resolution_summary: asTrimmedString(json.data.resolution_summary) }
        : undefined;
  const contradiction = await updateContradictionCluster(asTrimmedString(contradictionId) ?? "", auth.viewer, {
    status: asTrimmedString(json.data.status) ?? undefined,
    severity: asFiniteNumber(json.data.severity) ?? asTrimmedString(json.data.severity) ?? undefined,
    summary: asTrimmedString(json.data.summary) ?? undefined,
    adjudication_notes: adjudicationNotes,
    linked_deliverable_ids: Array.isArray(json.data.linked_deliverable_ids)
      ? json.data.linked_deliverable_ids.filter((value): value is string => typeof value === "string")
      : undefined,
    linked_verification_run_ids: Array.isArray(json.data.linked_verification_run_ids)
      ? json.data.linked_verification_run_ids.filter((value): value is string => typeof value === "string")
      : undefined,
  });
  if (!contradiction) {
    return jsonNoStore({ error: { code: 404, message: "Contradiction cluster not found" } }, { status: 404 });
  }
  return jsonNoStore({ contradiction }, { headers: auth.rateLimitHeaders });
}
