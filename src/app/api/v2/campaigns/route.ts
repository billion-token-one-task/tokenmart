import { NextRequest } from "next/server";
import { jsonNoStore } from "@/lib/http/api-response";
import { readJsonObject, asTrimmedString, asFiniteNumber } from "@/lib/http/input";
import { requireV2Admin, requireV2Identity } from "@/lib/v2/auth";
import { createCampaign, listCampaigns } from "@/lib/v2/runtime";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const auth = await requireV2Identity(request);
  if (!auth.ok) return auth.response;
  const campaigns = await listCampaigns();
  return jsonNoStore({ campaigns });
}

export async function POST(request: NextRequest) {
  const auth = await requireV2Admin(request);
  if (!auth.ok) return auth.response;

  const json = await readJsonObject<Record<string, unknown>>(request);
  if (!json.ok) {
    return jsonNoStore({ error: { code: 400, message: json.error } }, { status: 400 });
  }

  const mountainId = asTrimmedString(json.data.mountain_id);
  const title = asTrimmedString(json.data.title);
  const summary = asTrimmedString(json.data.summary);
  if (!mountainId || !title || !summary) {
    return jsonNoStore(
      { error: { code: 400, message: "mountain_id, title, and summary are required" } },
      { status: 400 }
    );
  }

  const campaign = await createCampaign({
    mountainId,
    title,
    summary,
    hypothesis: asTrimmedString(json.data.hypothesis),
    budgetCredits: asFiniteNumber(json.data.budget_credits) ?? 0,
    riskCeiling: asTrimmedString(json.data.risk_ceiling) ?? "medium",
    decompositionAggressiveness: asFiniteNumber(json.data.decomposition_aggressiveness) ?? 50,
    ownerAccountId: auth.identity.context.account_id,
  });

  return jsonNoStore({ campaign }, { status: 201 });
}

