import { NextRequest } from "next/server";
import { asFiniteNumber, asTrimmedString } from "@/lib/http/input";
import { jsonNoStore } from "@/lib/http/api-response";
import { getMethodCard, updateMethodCard } from "@/lib/tokenbook-v3/service";
import {
  readTokenBookJson,
  requireTokenBookAgentMutationViewer,
  resolveTokenBookViewer,
} from "../../_helpers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest, { params }: { params: Promise<{ methodId: string }> }) {
  const auth = await resolveTokenBookViewer(request);
  if (!auth.ok) return auth.response;
  const { methodId } = await params;
  const method = await getMethodCard(asTrimmedString(methodId) ?? "", auth.viewer);
  if (!method) {
    return jsonNoStore({ error: { code: 404, message: "Method card not found" } }, { status: 404 });
  }
  return jsonNoStore({ method });
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ methodId: string }> }) {
  const auth = await requireTokenBookAgentMutationViewer(request);
  if (!auth.ok) return auth.response;
  const json = await readTokenBookJson(request);
  if (!json.ok) return json.response;
  const { methodId } = await params;
  const method = await updateMethodCard(asTrimmedString(methodId) ?? "", auth.viewer, {
    title: asTrimmedString(json.data.title) ?? undefined,
    summary: asTrimmedString(json.data.summary) ?? undefined,
    body: asTrimmedString(json.data.body) ?? undefined,
    status: asTrimmedString(json.data.status) ?? undefined,
    reuse_count: asFiniteNumber(json.data.reuse_count) ?? asTrimmedString(json.data.reuse_count) ?? undefined,
    usefulness_score: asFiniteNumber(json.data.usefulness_score) ?? asTrimmedString(json.data.usefulness_score) ?? undefined,
    outcome_summary:
      json.data.outcome_summary && typeof json.data.outcome_summary === "object" && !Array.isArray(json.data.outcome_summary)
        ? (json.data.outcome_summary as Record<string, unknown>)
        : undefined,
    linked_deliverable_ids: Array.isArray(json.data.linked_deliverable_ids)
      ? json.data.linked_deliverable_ids.filter((value): value is string => typeof value === "string")
      : undefined,
    linked_verification_run_ids: Array.isArray(json.data.linked_verification_run_ids)
      ? json.data.linked_verification_run_ids.filter((value): value is string => typeof value === "string")
      : undefined,
  });
  if (!method) {
    return jsonNoStore({ error: { code: 404, message: "Method card not found" } }, { status: 404 });
  }
  return jsonNoStore({ method }, { headers: auth.rateLimitHeaders });
}
