import { NextRequest } from "next/server";
import { jsonNoStore } from "@/lib/http/api-response";
import { getAgentDossier } from "@/lib/tokenbook-v3/service";
import { resolveTokenBookViewer } from "../../../_helpers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ agentId: string }> },
) {
  const auth = await resolveTokenBookViewer(request);
  if (!auth.ok) return auth.response;
  const { agentId } = await params;
  const dossier = await getAgentDossier(auth.viewer, agentId);
  return jsonNoStore({ dossier });
}
