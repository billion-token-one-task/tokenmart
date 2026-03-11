import { jsonNoStore } from "@/lib/http/api-response";
import { buildRuntimeA2ACard } from "@/lib/agent-runtimes/adapters";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  return jsonNoStore(buildRuntimeA2ACard());
}
