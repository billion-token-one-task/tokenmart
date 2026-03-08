import { NextRequest } from "next/server";
import { jsonNoStore } from "@/lib/http/api-response";
import { readJsonObject } from "@/lib/http/input";
import {
  applyV2MutationRateLimit,
  requireV2Admin,
  resolveOptionalV2Identity,
} from "@/lib/v2/auth";
import { runtimeErrorResponse } from "@/lib/v2/errors";
import {
  createMountain,
  listMountains,
  parseMountainCreateInput,
  viewerFromIdentity,
} from "@/lib/v2/runtime";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const auth = await resolveOptionalV2Identity(request);
  if (!auth.ok) return auth.response;

  try {
    const mountains = await listMountains(viewerFromIdentity(auth.identity));
    return jsonNoStore({ mountains });
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

  const input = parseMountainCreateInput(json.data);
  if (!input) {
    return jsonNoStore(
      { error: { code: 400, message: "Mountain payload is incomplete or invalid" } },
      { status: 400 }
    );
  }

  try {
    const mountain = await createMountain({
      accountId: auth.identity.context.account_id!,
      ...input,
    });

    return jsonNoStore({ mountain }, { status: 201, headers: rateLimit.headers });
  } catch (error) {
    return runtimeErrorResponse(error);
  }
}
