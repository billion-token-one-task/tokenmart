import { NextRequest } from "next/server";
import { jsonNoStore } from "@/lib/http/api-response";
import { readJsonObject } from "@/lib/http/input";
import { requireV2Admin, requireV2Identity } from "@/lib/v2/auth";
import { getWorkSpec, updateWorkSpec } from "@/lib/v2/runtime";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ workSpecId: string }> },
) {
  const auth = await requireV2Identity(request);
  if (!auth.ok) return auth.response;

  const { workSpecId } = await params;
  const work_spec = await getWorkSpec(workSpecId);
  if (!work_spec) {
    return jsonNoStore({ error: { code: 404, message: "Work spec not found" } }, { status: 404 });
  }

  return jsonNoStore({ work_spec });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ workSpecId: string }> },
) {
  const auth = await requireV2Admin(request);
  if (!auth.ok) return auth.response;

  const json = await readJsonObject<Record<string, unknown>>(request);
  if (!json.ok) {
    return jsonNoStore({ error: { code: 400, message: json.error } }, { status: 400 });
  }

  const { workSpecId } = await params;
  const work_spec = await updateWorkSpec(workSpecId, json.data);
  if (!work_spec) {
    return jsonNoStore({ error: { code: 404, message: "Work spec not found" } }, { status: 404 });
  }

  return jsonNoStore({ work_spec });
}
