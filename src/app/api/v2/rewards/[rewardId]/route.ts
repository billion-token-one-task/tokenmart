import { NextRequest } from "next/server";
import { jsonNoStore } from "@/lib/http/api-response";
import { readJsonObject } from "@/lib/http/input";
import { requireV2Admin, requireV2Identity } from "@/lib/v2/auth";
import { getReward, updateReward } from "@/lib/v2/runtime";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ rewardId: string }> },
) {
  const auth = await requireV2Identity(request);
  if (!auth.ok) return auth.response;

  const { rewardId } = await params;
  const reward = await getReward(rewardId);
  if (!reward) {
    return jsonNoStore({ error: { code: 404, message: "Reward not found" } }, { status: 404 });
  }

  const canAccess =
    auth.identity.accountRole === "admin" ||
    auth.identity.accountRole === "super_admin" ||
    auth.identity.context.agent_id === reward.beneficiary_agent_id ||
    auth.identity.context.account_id === reward.beneficiary_account_id;

  if (!canAccess) {
    return jsonNoStore(
      { error: { code: 403, message: "Reward visibility is limited to admins or the beneficiary" } },
      { status: 403 },
    );
  }

  return jsonNoStore({ reward });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ rewardId: string }> },
) {
  const auth = await requireV2Admin(request);
  if (!auth.ok) return auth.response;

  const json = await readJsonObject<Record<string, unknown>>(request);
  if (!json.ok) {
    return jsonNoStore({ error: { code: 400, message: json.error } }, { status: 400 });
  }

  const { rewardId } = await params;
  const reward = await updateReward(rewardId, json.data);
  if (!reward) {
    return jsonNoStore({ error: { code: 404, message: "Reward not found" } }, { status: 404 });
  }

  return jsonNoStore({ reward });
}
