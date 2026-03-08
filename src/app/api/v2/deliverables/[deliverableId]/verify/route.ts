import { NextRequest } from "next/server";
import { jsonNoStore } from "@/lib/http/api-response";
import { readJsonObject, asFiniteNumber, asTrimmedString } from "@/lib/http/input";
import { applyV2MutationRateLimit, requireV2Identity } from "@/lib/v2/auth";
import { runtimeErrorResponse } from "@/lib/v2/errors";
import { completeDeliverableVerification, viewerFromIdentity } from "@/lib/v2/runtime";
import type { VerificationRunRecord } from "@/lib/v2/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function asRecordArray(value: unknown) {
  return Array.isArray(value)
    ? value.filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === "object")
    : [];
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ deliverableId: string }> },
) {
  const auth = await requireV2Identity(request, { requireAgent: false });
  if (!auth.ok) return auth.response;
  const rateLimit = await applyV2MutationRateLimit(auth.identity.context);
  if (!rateLimit.ok) return rateLimit.response;

  const json = await readJsonObject<Record<string, unknown>>(request);
  if (!json.ok) {
    return jsonNoStore({ error: { code: 400, message: json.error } }, { status: 400 });
  }

  const outcome = asTrimmedString(json.data.outcome) as VerificationRunRecord["outcome"] | null;
  const verificationRunId = asTrimmedString(json.data.verification_run_id);
  if (!outcome || !verificationRunId) {
    return jsonNoStore(
      { error: { code: 400, message: "verification_run_id and outcome are required" } },
      { status: 400 },
    );
  }

  try {
    const { deliverableId } = await params;
    const verification_run = await completeDeliverableVerification({
      viewer: viewerFromIdentity(auth.identity)!,
      deliverableId,
      verificationRunId,
      outcome,
      findings: asRecordArray(json.data.findings),
      evidenceBundle: asRecordArray(json.data.evidence_bundle),
      confidenceDelta: asFiniteNumber(json.data.confidence_delta) ?? 0,
      contradictionCount: asFiniteNumber(json.data.contradiction_count) ?? 0,
    });
    return jsonNoStore({ verification_run }, { headers: rateLimit.headers });
  } catch (error) {
    return runtimeErrorResponse(error);
  }
}
