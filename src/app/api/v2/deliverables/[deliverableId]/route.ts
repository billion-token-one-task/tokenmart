import { NextRequest } from "next/server";
import { jsonNoStore } from "@/lib/http/api-response";
import { readJsonObject } from "@/lib/http/input";
import { requireV2Identity } from "@/lib/v2/auth";
import { getDeliverable, updateDeliverable } from "@/lib/v2/runtime";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function ownsDeliverable(agentId: string | null, deliverableAgentId: string | null) {
  return Boolean(agentId) && Boolean(deliverableAgentId) && agentId === deliverableAgentId;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ deliverableId: string }> },
) {
  const auth = await requireV2Identity(request);
  if (!auth.ok) return auth.response;

  const { deliverableId } = await params;
  const deliverable = await getDeliverable(deliverableId);
  if (!deliverable) {
    return jsonNoStore({ error: { code: 404, message: "Deliverable not found" } }, { status: 404 });
  }

  const canAccess =
    auth.identity.accountRole === "admin" ||
    auth.identity.accountRole === "super_admin" ||
    ownsDeliverable(auth.identity.context.agent_id, deliverable.agent_id);

  if (!canAccess) {
    return jsonNoStore(
      { error: { code: 403, message: "Deliverable visibility is limited to admins or the producing agent" } },
      { status: 403 },
    );
  }

  return jsonNoStore({ deliverable });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ deliverableId: string }> },
) {
  const auth = await requireV2Identity(request, { requireAgent: false });
  if (!auth.ok) return auth.response;

  const { deliverableId } = await params;
  const existing = await getDeliverable(deliverableId);
  if (!existing) {
    return jsonNoStore({ error: { code: 404, message: "Deliverable not found" } }, { status: 404 });
  }

  const isAdmin =
    auth.identity.accountRole === "admin" || auth.identity.accountRole === "super_admin";
  const isOwner = ownsDeliverable(auth.identity.context.agent_id, existing.agent_id);
  if (!isAdmin && !isOwner) {
    return jsonNoStore(
      { error: { code: 403, message: "Deliverable updates are limited to admins or the producing agent" } },
      { status: 403 },
    );
  }

  const json = await readJsonObject<Record<string, unknown>>(request);
  if (!json.ok) {
    return jsonNoStore({ error: { code: 400, message: json.error } }, { status: 400 });
  }

  const patch = isAdmin
    ? json.data
    : {
        title: json.data.title,
        summary: json.data.summary,
        evidence_bundle: json.data.evidence_bundle,
        claims: json.data.claims,
        references_bundle: json.data.references_bundle,
        artifact_url: json.data.artifact_url,
        metadata: json.data.metadata,
      };

  const deliverable = await updateDeliverable(deliverableId, patch);
  if (!deliverable) {
    return jsonNoStore({ error: { code: 404, message: "Deliverable not found" } }, { status: 404 });
  }

  return jsonNoStore({ deliverable });
}
