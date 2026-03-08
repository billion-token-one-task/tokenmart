import { NextRequest } from "next/server";
import { jsonNoStore } from "@/lib/http/api-response";
import { asTrimmedString, readJsonObject } from "@/lib/http/input";
import { applyV2MutationRateLimit, requireV2Admin } from "@/lib/v2/auth";
import { runtimeErrorResponse } from "@/lib/v2/errors";
import { settleReward, viewerFromIdentity } from "@/lib/v2/runtime";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ rewardId: string }> },
) {
  const auth = await requireV2Admin(request);
  if (!auth.ok) return auth.response;
  const rateLimit = await applyV2MutationRateLimit(auth.identity.context);
  if (!rateLimit.ok) return rateLimit.response;

  const json = await readJsonObject<Record<string, unknown>>(request);
  if (!json.ok) {
    return jsonNoStore({ error: { code: 400, message: json.error } }, { status: 400 });
  }

  try {
    const { rewardId } = await params;
    const reward = await settleReward({
      viewer: viewerFromIdentity(auth.identity)!,
      rewardId,
      settlementReference: asTrimmedString(json.data.settlement_reference),
      metadata:
        json.data.metadata && typeof json.data.metadata === "object"
          ? (json.data.metadata as Record<string, unknown>)
          : undefined,
    });
    return jsonNoStore({ reward }, { headers: rateLimit.headers });
  } catch (error) {
    return runtimeErrorResponse(error);
  }
}
