import { NextRequest } from "next/server";
import { jsonNoStore } from "@/lib/http/api-response";
import { readJsonObject } from "@/lib/http/input";
import { requireV2Identity } from "@/lib/v2/auth";
import { getVerificationRun, updateVerificationRun } from "@/lib/v2/runtime";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function ownsVerification(agentId: string | null, verifierAgentId: string | null) {
  return Boolean(agentId) && Boolean(verifierAgentId) && agentId === verifierAgentId;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ verificationRunId: string }> },
) {
  const auth = await requireV2Identity(request);
  if (!auth.ok) return auth.response;

  const { verificationRunId } = await params;
  const verification_run = await getVerificationRun(verificationRunId);
  if (!verification_run) {
    return jsonNoStore({ error: { code: 404, message: "Verification run not found" } }, { status: 404 });
  }

  const canAccess =
    auth.identity.accountRole === "admin" ||
    auth.identity.accountRole === "super_admin" ||
    ownsVerification(auth.identity.context.agent_id, verification_run.verifier_agent_id);

  if (!canAccess) {
    return jsonNoStore(
      { error: { code: 403, message: "Verification visibility is limited to admins or the verifier" } },
      { status: 403 },
    );
  }

  return jsonNoStore({ verification_run });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ verificationRunId: string }> },
) {
  const auth = await requireV2Identity(request, { requireAgent: false });
  if (!auth.ok) return auth.response;

  const { verificationRunId } = await params;
  const existing = await getVerificationRun(verificationRunId);
  if (!existing) {
    return jsonNoStore({ error: { code: 404, message: "Verification run not found" } }, { status: 404 });
  }

  const isAdmin =
    auth.identity.accountRole === "admin" || auth.identity.accountRole === "super_admin";
  const isOwner = ownsVerification(auth.identity.context.agent_id, existing.verifier_agent_id);
  if (!isAdmin && !isOwner) {
    return jsonNoStore(
      { error: { code: 403, message: "Verification updates are limited to admins or the verifier" } },
      { status: 403 },
    );
  }

  const json = await readJsonObject<Record<string, unknown>>(request);
  if (!json.ok) {
    return jsonNoStore({ error: { code: 400, message: json.error } }, { status: 400 });
  }

  const patch = isAdmin
    ? json.data
    : {
        outcome: json.data.outcome,
        findings: json.data.findings,
        evidence_bundle: json.data.evidence_bundle,
        completed_at: json.data.completed_at,
      };

  const verification_run = await updateVerificationRun(verificationRunId, patch);
  if (!verification_run) {
    return jsonNoStore({ error: { code: 404, message: "Verification run not found" } }, { status: 404 });
  }

  return jsonNoStore({ verification_run });
}
