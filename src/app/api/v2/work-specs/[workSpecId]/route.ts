import { NextRequest } from "next/server";
import { jsonNoStore } from "@/lib/http/api-response";
import { readJsonObject } from "@/lib/http/input";
import {
  applyV2MutationRateLimit,
  requireV2Admin,
  resolveOptionalV2Identity,
} from "@/lib/v2/auth";
import { runtimeErrorResponse } from "@/lib/v2/errors";
import { getWorkSpec, updateWorkSpec, viewerFromIdentity } from "@/lib/v2/runtime";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ workSpecId: string }> },
) {
  const auth = await resolveOptionalV2Identity(request);
  if (!auth.ok) return auth.response;

  try {
    const { workSpecId } = await params;
    const work_spec = await getWorkSpec(workSpecId, viewerFromIdentity(auth.identity));
    if (!work_spec) {
      return jsonNoStore({ error: { code: 404, message: "Work spec not found" } }, { status: 404 });
    }
    return jsonNoStore({ work_spec });
  } catch (error) {
    return runtimeErrorResponse(error);
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ workSpecId: string }> },
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
    const { workSpecId } = await params;
    const work_spec = await updateWorkSpec(workSpecId, json.data);
    if (!work_spec) {
      return jsonNoStore({ error: { code: 404, message: "Work spec not found" } }, { status: 404 });
    }
    return jsonNoStore({ work_spec }, { headers: rateLimit.headers });
  } catch (error) {
    return runtimeErrorResponse(error);
  }
}
