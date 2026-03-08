import { NextRequest } from "next/server";
import { jsonNoStore } from "@/lib/http/api-response";
import { readJsonObject } from "@/lib/http/input";
import { requireV2Admin, requireV2Identity } from "@/lib/v2/auth";
import { getCampaign, updateCampaign } from "@/lib/v2/runtime";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ campaignId: string }> },
) {
  const auth = await requireV2Identity(request);
  if (!auth.ok) return auth.response;

  const { campaignId } = await params;
  const campaign = await getCampaign(campaignId);
  if (!campaign) {
    return jsonNoStore({ error: { code: 404, message: "Campaign not found" } }, { status: 404 });
  }

  return jsonNoStore({ campaign });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ campaignId: string }> },
) {
  const auth = await requireV2Admin(request);
  if (!auth.ok) return auth.response;

  const json = await readJsonObject<Record<string, unknown>>(request);
  if (!json.ok) {
    return jsonNoStore({ error: { code: 400, message: json.error } }, { status: 400 });
  }

  const { campaignId } = await params;
  const campaign = await updateCampaign(campaignId, json.data);
  if (!campaign) {
    return jsonNoStore({ error: { code: 404, message: "Campaign not found" } }, { status: 404 });
  }

  return jsonNoStore({ campaign });
}
