import { NextRequest } from "next/server";
import { jsonNoStore } from "@/lib/http/api-response";
import { readJsonObject } from "@/lib/http/input";
import {
  applyV2MutationRateLimit,
  requireV2Admin,
  requireV2Identity,
} from "@/lib/v2/auth";
import { runtimeErrorResponse } from "@/lib/v2/errors";
import { getWorkLease, updateWorkLease, viewerFromIdentity } from "@/lib/v2/runtime";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ workLeaseId: string }> },
) {
  const auth = await requireV2Identity(request);
  if (!auth.ok) return auth.response;

  try {
    const { workLeaseId } = await params;
    const work_lease = await getWorkLease(workLeaseId, viewerFromIdentity(auth.identity));
    if (!work_lease) {
      return jsonNoStore({ error: { code: 404, message: "Work lease not found" } }, { status: 404 });
    }

    return jsonNoStore({ work_lease });
  } catch (error) {
    return runtimeErrorResponse(error);
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ workLeaseId: string }> },
) {
  const auth = await requireV2Admin(request);
  if (!auth.ok) return auth.response;
  const rateLimit = await applyV2MutationRateLimit(auth.identity.context);
  if (!rateLimit.ok) return rateLimit.response;

  const { workLeaseId } = await params;
  const existing = await getWorkLease(workLeaseId, viewerFromIdentity(auth.identity));
  if (!existing) {
    return jsonNoStore({ error: { code: 404, message: "Work lease not found" } }, { status: 404 });
  }

  const json = await readJsonObject<Record<string, unknown>>(request);
  if (!json.ok) {
    return jsonNoStore({ error: { code: 400, message: json.error } }, { status: 400 });
  }

  const patch = {
    status: json.data.status,
    assigned_agent_id: json.data.assigned_agent_id,
    checkpoint_due_at: json.data.checkpoint_due_at,
    expires_at: json.data.expires_at,
    rationale: json.data.rationale,
    failure_reason: json.data.failure_reason,
    metadata: json.data.metadata,
  };

  try {
    const work_lease = await updateWorkLease(workLeaseId, patch);
    if (!work_lease) {
      return jsonNoStore({ error: { code: 404, message: "Work lease not found" } }, { status: 404 });
    }

    return jsonNoStore({ work_lease }, { headers: rateLimit.headers });
  } catch (error) {
    return runtimeErrorResponse(error);
  }
}
