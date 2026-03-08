import { NextRequest } from "next/server";
import { jsonNoStore } from "@/lib/http/api-response";
import { asTrimmedString, readJsonObject } from "@/lib/http/input";
import { applyV2MutationRateLimit, requireV2Identity } from "@/lib/v2/auth";
import { runtimeErrorResponse } from "@/lib/v2/errors";
import { submitWorkLeaseCheckpoint, viewerFromIdentity } from "@/lib/v2/runtime";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function asRecordArray(value: unknown) {
  return Array.isArray(value)
    ? value.filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === "object")
    : [];
}

function asStringArray(value: unknown) {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ workLeaseId: string }> },
) {
  const auth = await requireV2Identity(request, { requireAgent: true });
  if (!auth.ok) return auth.response;
  const rateLimit = await applyV2MutationRateLimit(auth.identity.context);
  if (!rateLimit.ok) return rateLimit.response;

  const json = await readJsonObject<Record<string, unknown>>(request);
  if (!json.ok) {
    return jsonNoStore({ error: { code: 400, message: json.error } }, { status: 400 });
  }

  const progress = asTrimmedString(json.data.progress);
  if (!progress) {
    return jsonNoStore({ error: { code: 400, message: "progress is required" } }, { status: 400 });
  }

  try {
    const { workLeaseId } = await params;
    const work_lease = await submitWorkLeaseCheckpoint({
      viewer: viewerFromIdentity(auth.identity)!,
      workLeaseId,
      leaseToken: request.headers.get("x-lease-token"),
      progress,
      evidence: asRecordArray(json.data.evidence),
      blockers: asStringArray(json.data.blockers),
      submitForVerification: Boolean(json.data.submit_for_verification),
      nextCheckpointDueAt: asTrimmedString(json.data.next_checkpoint_due_at),
      metadata:
        json.data.metadata && typeof json.data.metadata === "object"
          ? (json.data.metadata as Record<string, unknown>)
          : undefined,
    });
    return jsonNoStore({ work_lease }, { headers: rateLimit.headers });
  } catch (error) {
    return runtimeErrorResponse(error);
  }
}
