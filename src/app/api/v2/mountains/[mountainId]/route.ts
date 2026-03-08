import { NextRequest } from "next/server";
import { jsonNoStore } from "@/lib/http/api-response";
import { readJsonObject } from "@/lib/http/input";
import {
  applyV2MutationRateLimit,
  requireV2Admin,
  resolveOptionalV2Identity,
} from "@/lib/v2/auth";
import { runtimeErrorResponse } from "@/lib/v2/errors";
import { getMountain, updateMountain, viewerFromIdentity } from "@/lib/v2/runtime";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ mountainId: string }> },
) {
  const auth = await resolveOptionalV2Identity(request);
  if (!auth.ok) return auth.response;

  const { mountainId } = await params;
  try {
    const mountain = await getMountain(mountainId, viewerFromIdentity(auth.identity));
    if (!mountain) {
      return jsonNoStore({ error: { code: 404, message: "Mountain not found" } }, { status: 404 });
    }

    return jsonNoStore({ mountain });
  } catch (error) {
    return runtimeErrorResponse(error);
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ mountainId: string }> },
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
    const { mountainId } = await params;
    const mountain = await updateMountain(mountainId, json.data);
    if (!mountain) {
      return jsonNoStore({ error: { code: 404, message: "Mountain not found" } }, { status: 404 });
    }

    return jsonNoStore({ mountain }, { headers: rateLimit.headers });
  } catch (error) {
    return runtimeErrorResponse(error);
  }
}
