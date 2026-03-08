import { NextRequest } from "next/server";
import { jsonNoStore } from "@/lib/http/api-response";
import { resolveOptionalV2Identity } from "@/lib/v2/auth";
import { runtimeErrorResponse } from "@/lib/v2/errors";
import { getMountainDossier, viewerFromIdentity } from "@/lib/v2/runtime";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ mountainId: string }> },
) {
  const auth = await resolveOptionalV2Identity(request);
  if (!auth.ok) return auth.response;

  try {
    const { mountainId } = await params;
    const dossier = await getMountainDossier(mountainId, viewerFromIdentity(auth.identity));
    if (!dossier) {
      return jsonNoStore({ error: { code: 404, message: "Mountain dossier not found" } }, { status: 404 });
    }
    return jsonNoStore({ dossier });
  } catch (error) {
    return runtimeErrorResponse(error);
  }
}
