import { NextRequest } from "next/server";
import { jsonNoStore } from "@/lib/http/api-response";
import { readJsonObject, asTrimmedString } from "@/lib/http/input";
import {
  applyV2MutationRateLimit,
  requireV2Admin,
  requireV2Identity,
} from "@/lib/v2/auth";
import { runtimeErrorResponse } from "@/lib/v2/errors";
import { issueSupervisorReplan, listReplans, viewerFromIdentity } from "@/lib/v2/runtime";
import type { ReplanRecord } from "@/lib/v2/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const auth = await requireV2Identity(request);
  if (!auth.ok) return auth.response;
  try {
    const replans = await listReplans(viewerFromIdentity(auth.identity));
    return jsonNoStore({ replans });
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
  const action = asTrimmedString(json.data.action);
  const summary = asTrimmedString(json.data.summary);
  const reason = asTrimmedString(json.data.reason) as ReplanRecord["reason"] | null;
  if (!mountainId || !action || !summary || !reason) {
    return jsonNoStore(
      {
        error: {
          code: 400,
          message: "mountain_id, action, summary, and reason are required",
        },
      },
      { status: 400 }
    );
  }

  try {
    const replan = await issueSupervisorReplan({
      viewer: viewerFromIdentity(auth.identity)!,
      mountainId,
      campaignId: asTrimmedString(json.data.campaign_id),
      workSpecId: asTrimmedString(json.data.work_spec_id),
      workLeaseId: asTrimmedString(json.data.work_lease_id),
      reason,
      action,
      summary,
    });

    return jsonNoStore({ replan }, { status: 201, headers: rateLimit.headers });
  } catch (error) {
    return runtimeErrorResponse(error);
  }
}
