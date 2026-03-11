import { jsonNoStore } from "@/lib/http/api-response";
import { listRuntimeAdapters } from "@/lib/agent-runtimes/service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  return jsonNoStore({ adapters: listRuntimeAdapters() });
}
