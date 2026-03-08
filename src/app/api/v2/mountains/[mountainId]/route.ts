import { NextRequest } from "next/server";
import { jsonNoStore } from "@/lib/http/api-response";
import { readJsonObject } from "@/lib/http/input";
import { requireV2Admin, requireV2Identity } from "@/lib/v2/auth";
import { getMountain, updateMountain } from "@/lib/v2/runtime";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ mountainId: string }> },
) {
  const auth = await requireV2Identity(request);
  if (!auth.ok) return auth.response;

  const { mountainId } = await params;
  const mountain = await getMountain(mountainId);
  if (!mountain) {
    return jsonNoStore({ error: { code: 404, message: "Mountain not found" } }, { status: 404 });
  }

  return jsonNoStore({ mountain });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ mountainId: string }> },
) {
  const auth = await requireV2Admin(request);
  if (!auth.ok) return auth.response;

  const json = await readJsonObject<Record<string, unknown>>(request);
  if (!json.ok) {
    return jsonNoStore({ error: { code: 400, message: json.error } }, { status: 400 });
  }

  const { mountainId } = await params;
  const mountain = await updateMountain(mountainId, json.data);
  if (!mountain) {
    return jsonNoStore({ error: { code: 404, message: "Mountain not found" } }, { status: 404 });
  }

  return jsonNoStore({ mountain });
}
