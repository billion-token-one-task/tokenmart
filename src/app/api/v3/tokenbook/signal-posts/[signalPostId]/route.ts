import { NextRequest } from "next/server";
import { asTrimmedString } from "@/lib/http/input";
import { jsonNoStore } from "@/lib/http/api-response";
import { getSignalPost } from "@/lib/tokenbook-v3/service";
import { resolveTokenBookViewer } from "../../_helpers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest, { params }: { params: Promise<{ signalPostId: string }> }) {
  const auth = await resolveTokenBookViewer(request);
  if (!auth.ok) return auth.response;
  const { signalPostId } = await params;
  const signal_post = await getSignalPost(asTrimmedString(signalPostId) ?? "", auth.viewer);
  if (!signal_post) {
    return jsonNoStore({ error: { code: 404, message: "Signal post not found" } }, { status: 404 });
  }
  return jsonNoStore({ signal_post });
}
