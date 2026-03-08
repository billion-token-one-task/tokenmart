import { NextRequest } from "next/server";
import { jsonNoStore } from "@/lib/http/api-response";
import { readJsonObject } from "@/lib/http/input";
import { requireV2Identity } from "@/lib/v2/auth";
import { getWorkLease, updateWorkLease } from "@/lib/v2/runtime";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function ownsLease(agentId: string | null, assignedAgentId: string | null) {
  return Boolean(agentId) && Boolean(assignedAgentId) && agentId === assignedAgentId;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ workLeaseId: string }> },
) {
  const auth = await requireV2Identity(request);
  if (!auth.ok) return auth.response;

  const { workLeaseId } = await params;
  const work_lease = await getWorkLease(workLeaseId);
  if (!work_lease) {
    return jsonNoStore({ error: { code: 404, message: "Work lease not found" } }, { status: 404 });
  }

  const canAccess =
    auth.identity.accountRole === "admin" ||
    auth.identity.accountRole === "super_admin" ||
    ownsLease(auth.identity.context.agent_id, work_lease.assigned_agent_id);

  if (!canAccess) {
    return jsonNoStore(
      { error: { code: 403, message: "Work lease visibility is limited to admins or the assigned agent" } },
      { status: 403 },
    );
  }

  return jsonNoStore({ work_lease });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ workLeaseId: string }> },
) {
  const auth = await requireV2Identity(request, { requireAgent: false });
  if (!auth.ok) return auth.response;

  const { workLeaseId } = await params;
  const existing = await getWorkLease(workLeaseId);
  if (!existing) {
    return jsonNoStore({ error: { code: 404, message: "Work lease not found" } }, { status: 404 });
  }

  const isAdmin =
    auth.identity.accountRole === "admin" || auth.identity.accountRole === "super_admin";
  const isOwner = ownsLease(auth.identity.context.agent_id, existing.assigned_agent_id);
  if (!isAdmin && !isOwner) {
    return jsonNoStore(
      { error: { code: 403, message: "Work lease updates are limited to admins or the assigned agent" } },
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
        status: json.data.status,
        accepted_at: json.data.accepted_at,
        started_at: json.data.started_at,
        checkpoint_due_at: json.data.checkpoint_due_at,
        submitted_at: json.data.submitted_at,
        verified_at: json.data.verified_at,
        failure_reason: json.data.failure_reason,
        checkpoint_payload: json.data.checkpoint_payload,
        metadata: json.data.metadata,
      };

  const work_lease = await updateWorkLease(workLeaseId, patch);
  if (!work_lease) {
    return jsonNoStore({ error: { code: 404, message: "Work lease not found" } }, { status: 404 });
  }

  return jsonNoStore({ work_lease });
}
