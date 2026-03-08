import { NextRequest } from "next/server";
import { jsonNoStore } from "@/lib/http/api-response";
import { readJsonObject, asTrimmedString } from "@/lib/http/input";
import { requireV2Admin, requireV2Identity } from "@/lib/v2/auth";
import { createReplan, listReplans } from "@/lib/v2/runtime";
import type { ReplanRecord } from "@/lib/v2/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const auth = await requireV2Identity(request);
  if (!auth.ok) return auth.response;
  const replans = await listReplans();
  return jsonNoStore({ replans });
}

export async function POST(request: NextRequest) {
  const auth = await requireV2Admin(request);
  if (!auth.ok) return auth.response;

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

  const replan = await createReplan({
    mountainId,
    campaignId: asTrimmedString(json.data.campaign_id),
    workSpecId: asTrimmedString(json.data.work_spec_id),
    workLeaseId: asTrimmedString(json.data.work_lease_id),
    issuedByAccountId: auth.identity.context.account_id,
    reason,
    action,
    summary,
  });

  return jsonNoStore({ replan }, { status: 201 });
}

