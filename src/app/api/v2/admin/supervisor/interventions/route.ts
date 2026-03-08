import { NextRequest } from "next/server";
import { jsonNoStore } from "@/lib/http/api-response";
import { readJsonObject, asTrimmedString } from "@/lib/http/input";
import { applyV2MutationRateLimit, requireV2Admin } from "@/lib/v2/auth";
import { runtimeErrorResponse } from "@/lib/v2/errors";
import { issueSupervisorReplan, viewerFromIdentity } from "@/lib/v2/runtime";
import type { ReplanRecord } from "@/lib/v2/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

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
  const action = asTrimmedString(json.data.action);
  const summary = asTrimmedString(json.data.summary);
  const reason = asTrimmedString(json.data.reason) as ReplanRecord["reason"] | null;
  if (!mountainId || !action || !summary || !reason) {
    return jsonNoStore(
      {
        error: {
          code: 400,
          message:
            "Interventions require mountain_id, action, summary, and reason to create a supervisor mutation",
        },
      },
      { status: 400 }
    );
  }

  try {
    const intervention = await issueSupervisorReplan({
      viewer: viewerFromIdentity(auth.identity)!,
      mountainId,
      campaignId: asTrimmedString(json.data.campaign_id),
      workSpecId: asTrimmedString(json.data.work_spec_id),
      workLeaseId: asTrimmedString(json.data.work_lease_id),
      reason,
      action,
      summary,
      payload: {
        target_type: asTrimmedString(json.data.target_type),
        target_id: asTrimmedString(json.data.target_id),
        escalation: asTrimmedString(json.data.escalation),
      },
    });

    return jsonNoStore({ intervention }, { status: 201, headers: rateLimit.headers });
  } catch (error) {
    return runtimeErrorResponse(error);
  }
}
