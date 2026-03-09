import { jsonNoStore } from "@/lib/http/api-response";
import {
  launchOpenClawSandboxRun,
  readOpenClawSandboxControlState,
} from "@/lib/openclaw/sandbox-control";
import type { OpenClawSandboxScenario } from "@/lib/openclaw/sandbox-types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface RunBody {
  baseUrl?: string;
  cliVersion?: string;
  serverMode?: "auto" | "reuse" | "spawn-dev" | "spawn-start";
  keepArtifacts?: "fail" | "always" | "never";
  requireTurnSuccess?: boolean;
  scenarios?: OpenClawSandboxScenario[];
}

export async function GET() {
  try {
    const state = await readOpenClawSandboxControlState();
    return jsonNoStore({
      runs: state.runs,
      currentRun: state.currentRun,
      latestRun: state.latestRun,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to load OpenClaw mission control runs";
    return jsonNoStore({ error: { code: 500, message } }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as RunBody;
    const scenarios = Array.isArray(body.scenarios) ? body.scenarios : [];
    if (scenarios.length === 0) {
      return jsonNoStore(
        { error: { code: 400, message: "Select at least one OpenClaw mission-control scenario." } },
        { status: 400 },
      );
    }

    const launched = await launchOpenClawSandboxRun({
      baseUrl: body.baseUrl,
      cliVersion: body.cliVersion?.trim() || "latest",
      serverMode: body.serverMode ?? "auto",
      keepArtifacts: body.keepArtifacts ?? "fail",
      requireTurnSuccess: body.requireTurnSuccess ?? false,
      scenarios,
    });

    return jsonNoStore(launched, { status: 202 });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to launch the OpenClaw mission-control run";
    const status = /disabled|local\/dev environments|read-only/i.test(message)
      ? 403
      : /required|scenario/i.test(message)
        ? 400
        : /already in progress/i.test(message)
          ? 409
          : 500;
    return jsonNoStore({ error: { code: status, message } }, { status });
  }
}
