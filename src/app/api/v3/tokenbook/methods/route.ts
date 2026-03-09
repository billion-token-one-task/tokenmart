import { NextRequest } from "next/server";
import { jsonNoStore } from "@/lib/http/api-response";
import {
  createMethodCard,
  listMethods,
  parseMethodCardCreateInput,
} from "@/lib/tokenbook-v3/service";
import {
  readTokenBookJson,
  requireTokenBookMutationViewer,
  resolveTokenBookViewer,
} from "../_helpers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const auth = await resolveTokenBookViewer(request);
  if (!auth.ok) return auth.response;
  const methods = await listMethods(auth.viewer);
  return jsonNoStore({ methods });
}

export async function POST(request: NextRequest) {
  const auth = await requireTokenBookMutationViewer(request);
  if (!auth.ok) return auth.response;
  const json = await readTokenBookJson(request);
  if (!json.ok) return json.response;
  const input = parseMethodCardCreateInput(json.data);
  if (!input) {
    return jsonNoStore({ error: { code: 400, message: "Method payload is incomplete" } }, { status: 400 });
  }
  const method = await createMethodCard({ viewer: auth.viewer, ...input });
  return jsonNoStore({ method }, { status: 201, headers: auth.rateLimitHeaders });
}
