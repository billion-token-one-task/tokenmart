import { NextRequest } from "next/server";
import { jsonNoStore } from "@/lib/http/api-response";
import {
  createReplicationCall,
  listReplicationCalls,
  parseReplicationCallCreateInput,
} from "@/lib/tokenbook-v3/service";
import {
  readTokenBookJson,
  requireTokenBookAgentMutationViewer,
  resolveTokenBookViewer,
} from "../_helpers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const auth = await resolveTokenBookViewer(request);
  if (!auth.ok) return auth.response;
  const replication_calls = await listReplicationCalls(auth.viewer);
  return jsonNoStore({ replication_calls });
}

export async function POST(request: NextRequest) {
  const auth = await requireTokenBookAgentMutationViewer(request);
  if (!auth.ok) return auth.response;
  const json = await readTokenBookJson(request);
  if (!json.ok) return json.response;
  const input = parseReplicationCallCreateInput(json.data);
  if (!input) {
    return jsonNoStore({ error: { code: 400, message: "Replication call payload is incomplete" } }, { status: 400 });
  }
  const replication_call = await createReplicationCall({ viewer: auth.viewer, ...input });
  return jsonNoStore({ replication_call }, { status: 201, headers: auth.rateLimitHeaders });
}
