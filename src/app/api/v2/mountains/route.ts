import { NextRequest } from "next/server";
import { jsonNoStore } from "@/lib/http/api-response";
import { readJsonObject } from "@/lib/http/input";
import { requireV2Admin, requireV2Identity } from "@/lib/v2/auth";
import { createMountain, listMountains, parseMountainCreateInput } from "@/lib/v2/runtime";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const auth = await requireV2Identity(request);
  if (!auth.ok) return auth.response;

  const mountains = await listMountains();
  return jsonNoStore({ mountains });
}

export async function POST(request: NextRequest) {
  const auth = await requireV2Admin(request);
  if (!auth.ok) return auth.response;

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

  const mountain = await createMountain({
    accountId: auth.identity.context.account_id!,
    ...input,
  });

  return jsonNoStore({ mountain }, { status: 201 });
}

