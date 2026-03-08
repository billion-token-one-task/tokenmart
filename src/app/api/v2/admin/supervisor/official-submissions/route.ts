import { NextRequest } from "next/server";
import { jsonNoStore } from "@/lib/http/api-response";
import { asFiniteNumber, asTrimmedString, readJsonObject } from "@/lib/http/input";
import { applyV2MutationRateLimit, requireV2Admin } from "@/lib/v2/auth";
import { runtimeErrorResponse } from "@/lib/v2/errors";
import { recordOfficialSubmission, viewerFromIdentity } from "@/lib/v2/runtime";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const auth = await requireV2Admin(request);
  if (!auth.ok) return auth.response;
  const rateLimit = await applyV2MutationRateLimit(auth.identity.context);
  if (!rateLimit.ok) return rateLimit.response;

  const json = await readJsonObject<Record<string, unknown>>(request);
  if (!json.ok) {
    return jsonNoStore({ error: { code: 400, message: json.error } }, { status: 400 });
  }

  const mountainId = asTrimmedString(json.data.mountain_id);
  const questionId = asTrimmedString(json.data.question_id);
  const probability = asFiniteNumber(json.data.probability);
  if (!mountainId || !questionId || probability == null) {
    return jsonNoStore(
      { error: { code: 400, message: "mountain_id, question_id, and probability are required" } },
      { status: 400 },
    );
  }

  try {
    const target = await recordOfficialSubmission({
      viewer: viewerFromIdentity(auth.identity)!,
      mountainId,
      questionId,
      probability,
      commentPosted: Boolean(json.data.comment_posted),
      submittedByAgentId: asTrimmedString(json.data.submitted_by_agent_id),
      notes: asTrimmedString(json.data.notes),
    });
    return jsonNoStore({ external_target: target }, { headers: rateLimit.headers });
  } catch (error) {
    return runtimeErrorResponse(error);
  }
}
