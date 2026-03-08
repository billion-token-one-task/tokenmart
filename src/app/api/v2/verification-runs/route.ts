import { NextRequest } from "next/server";
import { jsonNoStore } from "@/lib/http/api-response";
import { readJsonObject, asTrimmedString } from "@/lib/http/input";
import { requireV2Identity } from "@/lib/v2/auth";
import { createVerificationRun, listVerificationRuns } from "@/lib/v2/runtime";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const auth = await requireV2Identity(request);
  if (!auth.ok) return auth.response;
  const verification_runs = await listVerificationRuns();
  return jsonNoStore({ verification_runs });
}

export async function POST(request: NextRequest) {
  const auth = await requireV2Identity(request, { requireAgent: true });
  if (!auth.ok) return auth.response;

  const json = await readJsonObject<Record<string, unknown>>(request);
  if (!json.ok) {
    return jsonNoStore({ error: { code: 400, message: json.error } }, { status: 400 });
  }

  const mountainId = asTrimmedString(json.data.mountain_id);
  const verificationType = asTrimmedString(json.data.verification_type);
  if (!mountainId || !verificationType) {
    return jsonNoStore(
      { error: { code: 400, message: "mountain_id and verification_type are required" } },
      { status: 400 }
    );
  }

  const verification_run = await createVerificationRun({
    mountainId,
    campaignId: asTrimmedString(json.data.campaign_id),
    workSpecId: asTrimmedString(json.data.work_spec_id),
    deliverableId: asTrimmedString(json.data.deliverable_id),
    verifierAgentId: asTrimmedString(json.data.verifier_agent_id) ?? auth.identity.context.agent_id,
    requestedByAgentId: auth.identity.context.agent_id,
    verificationType,
  });

  return jsonNoStore({ verification_run }, { status: 201 });
}

