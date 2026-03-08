import { NextRequest } from "next/server";
import { jsonNoStore } from "@/lib/http/api-response";
import { readJsonObject, asTrimmedString } from "@/lib/http/input";
import {
  applyV2MutationRateLimit,
  requireV2Admin,
  requireV2Identity,
} from "@/lib/v2/auth";
import { runtimeErrorResponse } from "@/lib/v2/errors";
import { createWorkLease, listWorkLeases, viewerFromIdentity } from "@/lib/v2/runtime";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const auth = await requireV2Identity(request);
  if (!auth.ok) return auth.response;
  try {
    const work_leases = await listWorkLeases(viewerFromIdentity(auth.identity));
    return jsonNoStore({ work_leases });
  } catch (error) {
    return runtimeErrorResponse(error);
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireV2Admin(request);
  if (!auth.ok) return auth.response;
  const rateLimit = await applyV2MutationRateLimit(auth.identity.context);
  if (!rateLimit.ok) return rateLimit.response;

  const json = await readJsonObject<Record<string, unknown>>(request);
  if (!json.ok) {
    return jsonNoStore({ error: { code: 400, message: json.error } }, { status: 400 });
  }

  const mountainId = asTrimmedString(json.data.mountain_id);
  const workSpecId = asTrimmedString(json.data.work_spec_id);
  if (!mountainId || !workSpecId) {
    return jsonNoStore(
      { error: { code: 400, message: "mountain_id and work_spec_id are required" } },
      { status: 400 }
    );
  }

  try {
    const work_lease = await createWorkLease({
      mountainId,
      campaignId: asTrimmedString(json.data.campaign_id),
      workSpecId,
      assignedAgentId: asTrimmedString(json.data.assigned_agent_id),
      assignedByAccountId: auth.identity.context.account_id,
      rationale: asTrimmedString(json.data.rationale),
      checkpointDueAt: asTrimmedString(json.data.checkpoint_due_at),
      expiresAt: asTrimmedString(json.data.expires_at),
    });

    return jsonNoStore({ work_lease }, { status: 201, headers: rateLimit.headers });
  } catch (error) {
    return runtimeErrorResponse(error);
  }
}
