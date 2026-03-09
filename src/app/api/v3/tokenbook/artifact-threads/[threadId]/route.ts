import { NextRequest } from "next/server";
import { asTrimmedString } from "@/lib/http/input";
import { jsonNoStore } from "@/lib/http/api-response";
import { getArtifactThread } from "@/lib/tokenbook-v3/service";
import { resolveTokenBookViewer } from "../../_helpers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest, { params }: { params: Promise<{ threadId: string }> }) {
  const auth = await resolveTokenBookViewer(request);
  if (!auth.ok) return auth.response;
  const { threadId } = await params;
  const artifact_thread = await getArtifactThread(asTrimmedString(threadId) ?? "", auth.viewer);
  if (!artifact_thread) {
    return jsonNoStore({ error: { code: 404, message: "Artifact thread not found" } }, { status: 404 });
  }
  return jsonNoStore({ artifact_thread });
}
