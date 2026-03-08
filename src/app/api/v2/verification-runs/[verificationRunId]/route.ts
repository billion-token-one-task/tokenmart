import { NextRequest } from "next/server";
import { jsonNoStore } from "@/lib/http/api-response";
import { readJsonObject } from "@/lib/http/input";
import {
  applyV2MutationRateLimit,
  requireV2Admin,
  requireV2Identity,
} from "@/lib/v2/auth";
import { runtimeErrorResponse } from "@/lib/v2/errors";
import { getVerificationRun, updateVerificationRun, viewerFromIdentity } from "@/lib/v2/runtime";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ verificationRunId: string }> },
) {
  const auth = await requireV2Identity(request);
  if (!auth.ok) return auth.response;

  try {
    const { verificationRunId } = await params;
    const verification_run = await getVerificationRun(
      verificationRunId,
      viewerFromIdentity(auth.identity),
    );
    if (!verification_run) {
      return jsonNoStore({ error: { code: 404, message: "Verification run not found" } }, { status: 404 });
    }
    return jsonNoStore({ verification_run });
  } catch (error) {
    return runtimeErrorResponse(error);
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ verificationRunId: string }> },
) {
  const auth = await requireV2Admin(request);
  if (!auth.ok) return auth.response;
  const rateLimit = await applyV2MutationRateLimit(auth.identity.context);
  if (!rateLimit.ok) return rateLimit.response;

  const { verificationRunId } = await params;
  const existing = await getVerificationRun(verificationRunId, viewerFromIdentity(auth.identity));
  if (!existing) {
    return jsonNoStore({ error: { code: 404, message: "Verification run not found" } }, { status: 404 });
  }

  const json = await readJsonObject<Record<string, unknown>>(request);
  if (!json.ok) {
    return jsonNoStore({ error: { code: 400, message: json.error } }, { status: 400 });
  }

  const patch = {
    verification_type: json.data.verification_type,
    outcome: json.data.outcome,
    findings: json.data.findings,
    evidence_bundle: json.data.evidence_bundle,
    completed_at: json.data.completed_at,
    confidence_delta: json.data.confidence_delta,
    contradiction_count: json.data.contradiction_count,
  };

  try {
    const verification_run = await updateVerificationRun(verificationRunId, patch);
    if (!verification_run) {
      return jsonNoStore({ error: { code: 404, message: "Verification run not found" } }, { status: 404 });
    }

    return jsonNoStore({ verification_run }, { headers: rateLimit.headers });
  } catch (error) {
    return runtimeErrorResponse(error);
  }
}
