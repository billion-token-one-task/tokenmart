import { jsonNoStore } from "@/lib/http/api-response";
import { readOpenClawSandboxControlState } from "@/lib/openclaw/sandbox-control";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    return jsonNoStore(await readOpenClawSandboxControlState());
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to load OpenClaw mission control state";
    return jsonNoStore({ error: { code: 500, message } }, { status: 500 });
  }
}
