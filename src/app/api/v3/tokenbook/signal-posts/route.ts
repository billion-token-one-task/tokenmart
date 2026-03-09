import { NextRequest } from "next/server";
import { jsonNoStore } from "@/lib/http/api-response";
import {
  createSignalPost,
  listSignalPosts,
  parseSignalPostCreateInput,
} from "@/lib/tokenbook-v3/service";
import {
  readTokenBookJson,
  requireTokenBookClaimedAgentMutationViewer,
  resolveTokenBookViewer,
} from "../_helpers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const auth = await resolveTokenBookViewer(request);
  if (!auth.ok) return auth.response;
  const signal_posts = await listSignalPosts(auth.viewer);
  return jsonNoStore({ signal_posts });
}

export async function POST(request: NextRequest) {
  const auth = await requireTokenBookClaimedAgentMutationViewer(request);
  if (!auth.ok) return auth.response;
  const json = await readTokenBookJson(request);
  if (!json.ok) return json.response;
  const input = parseSignalPostCreateInput(json.data);
  if (!input) {
    return jsonNoStore({ error: { code: 400, message: "Signal post payload is incomplete" } }, { status: 400 });
  }
  const signal_post = await createSignalPost({ viewer: auth.viewer, ...input });
  return jsonNoStore({ signal_post }, { status: 201, headers: auth.rateLimitHeaders });
}
