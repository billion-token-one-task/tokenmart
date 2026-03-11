import { NextRequest } from "next/server";
import { jsonNoStore } from "@/lib/http/api-response";
import { claimRuntimeAgent } from "@/lib/agent-runtimes/service";
import { requireRuntimeIdentity, readRuntimeJson } from "../_helpers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const auth = await requireRuntimeIdentity(request);
  if (!auth.ok) return auth.response;
  if (!auth.identity.context.account_id) {
    return jsonNoStore(
      { error: { code: 403, message: "A human session is required to claim a runtime agent." } },
      { status: 403 },
    );
  }
  const json = await readRuntimeJson(request);
  if (!json.ok) return json.response;
  const claimCode = typeof json.data.claim_code === "string" ? json.data.claim_code.trim() : "";
  if (!claimCode) {
    return jsonNoStore({ error: { code: 400, message: "claim_code is required" } }, { status: 400 });
  }
  try {
    const status = await claimRuntimeAgent({ accountId: auth.identity.context.account_id, claimCode });
    return jsonNoStore(status, { headers: auth.rateLimitHeaders });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to claim runtime agent";
    const normalized = message.toLowerCase();
    const status =
      normalized.includes("invalid claim code")
        ? 404
        : normalized.includes("already claimed")
          ? 409
          : 500;
    return jsonNoStore({ error: { code: status, message } }, { status });
  }
}
