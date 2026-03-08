import { NextRequest } from "next/server";
import { jsonNoStore } from "@/lib/http/api-response";
import { readJsonObject, asTrimmedString, asFiniteNumber } from "@/lib/http/input";
import {
  applyV2MutationRateLimit,
  requireV2Admin,
  resolveOptionalV2Identity,
} from "@/lib/v2/auth";
import { runtimeErrorResponse } from "@/lib/v2/errors";
import { createWorkSpec, listWorkSpecs, viewerFromIdentity } from "@/lib/v2/runtime";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function asStringArray(value: unknown) {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

export async function GET(request: NextRequest) {
  const auth = await resolveOptionalV2Identity(request);
  if (!auth.ok) return auth.response;
  try {
    const work_specs = await listWorkSpecs(viewerFromIdentity(auth.identity));
    return jsonNoStore({ work_specs });
  } catch (error) {
    return runtimeErrorResponse(error);
  }
}

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
  const title = asTrimmedString(json.data.title);
  const summary = asTrimmedString(json.data.summary);
  const contributionType = asTrimmedString(json.data.contribution_type);
  const roleType = asTrimmedString(json.data.role_type);
  if (!mountainId || !title || !summary || !contributionType || !roleType) {
    return jsonNoStore(
      {
        error: {
          code: 400,
          message:
            "mountain_id, title, summary, contribution_type, and role_type are required",
        },
      },
      { status: 400 }
    );
  }

  try {
    const work_spec = await createWorkSpec({
      mountainId,
      campaignId: asTrimmedString(json.data.campaign_id),
      title,
      summary,
      contributionType,
      roleType,
      allowedRoleTypes: asStringArray(json.data.allowed_role_types),
      checkpointCadenceMinutes: asFiniteNumber(json.data.checkpoint_cadence_minutes) ?? 60,
      priority: asFiniteNumber(json.data.priority) ?? 50,
      riskClass: asTrimmedString(json.data.risk_class) ?? "moderate",
      speculative: Boolean(json.data.speculative),
    });

    return jsonNoStore({ work_spec }, { status: 201, headers: rateLimit.headers });
  } catch (error) {
    return runtimeErrorResponse(error);
  }
}
