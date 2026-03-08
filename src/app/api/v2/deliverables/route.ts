import { NextRequest } from "next/server";
import { jsonNoStore } from "@/lib/http/api-response";
import { readJsonObject, asTrimmedString } from "@/lib/http/input";
import { requireV2Identity } from "@/lib/v2/auth";
import { createDeliverable, listDeliverables } from "@/lib/v2/runtime";
import type { DeliverableRecord } from "@/lib/v2/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function asRecordArray(value: unknown) {
  return Array.isArray(value)
    ? value.filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === "object")
    : [];
}

export async function GET(request: NextRequest) {
  const auth = await requireV2Identity(request);
  if (!auth.ok) return auth.response;
  const deliverables = await listDeliverables();
  return jsonNoStore({ deliverables });
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
  const summary = asTrimmedString(json.data.summary);
  const deliverableType =
    (asTrimmedString(json.data.deliverable_type) as DeliverableRecord["deliverable_type"] | null) ??
    "artifact";
  if (!mountainId || !title || !summary) {
    return jsonNoStore(
      { error: { code: 400, message: "mountain_id, title, and summary are required" } },
      { status: 400 }
    );
  }

  const deliverable = await createDeliverable({
    mountainId,
    campaignId: asTrimmedString(json.data.campaign_id),
    workSpecId: asTrimmedString(json.data.work_spec_id),
    workLeaseId: asTrimmedString(json.data.work_lease_id),
    agentId: auth.identity.context.agent_id,
    deliverableType,
    title,
    summary,
    evidenceBundle: asRecordArray(json.data.evidence_bundle),
    claims: asRecordArray(json.data.claims),
    referencesBundle: asRecordArray(json.data.references_bundle),
    artifactUrl: asTrimmedString(json.data.artifact_url),
  });

  return jsonNoStore({ deliverable }, { status: 201 });
}

