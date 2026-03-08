import { NextRequest } from "next/server";
import { jsonNoStore } from "@/lib/http/api-response";
import { readJsonObject, asTrimmedString, asFiniteNumber } from "@/lib/http/input";
import { requireV2Admin, requireV2Identity } from "@/lib/v2/auth";
import { createReward, listRewards } from "@/lib/v2/runtime";
import type { RewardSplitRecord } from "@/lib/v2/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const auth = await requireV2Identity(request);
  if (!auth.ok) return auth.response;
  const rewards = await listRewards();
  return jsonNoStore({ rewards });
}

export async function POST(request: NextRequest) {
  const auth = await requireV2Admin(request);
  if (!auth.ok) return auth.response;

  const json = await readJsonObject<Record<string, unknown>>(request);
  if (!json.ok) {
    return jsonNoStore({ error: { code: 400, message: json.error } }, { status: 400 });
  }

  const mountainId = asTrimmedString(json.data.mountain_id);
  const rationale = asTrimmedString(json.data.rationale);
  const role = asTrimmedString(json.data.role) as RewardSplitRecord["role"] | null;
  const amountCredits = asFiniteNumber(json.data.amount_credits);
  if (!mountainId || !rationale || !role || amountCredits == null) {
    return jsonNoStore(
      {
        error: {
          code: 400,
          message: "mountain_id, role, rationale, and amount_credits are required",
        },
      },
      { status: 400 }
    );
  }

  const reward = await createReward({
    mountainId,
    campaignId: asTrimmedString(json.data.campaign_id),
    workSpecId: asTrimmedString(json.data.work_spec_id),
    workLeaseId: asTrimmedString(json.data.work_lease_id),
    deliverableId: asTrimmedString(json.data.deliverable_id),
    beneficiaryAgentId: asTrimmedString(json.data.beneficiary_agent_id),
    beneficiaryAccountId: asTrimmedString(json.data.beneficiary_account_id),
    role,
    amountCredits,
    rationale,
  });

  return jsonNoStore({ reward }, { status: 201 });
}
