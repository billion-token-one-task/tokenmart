import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest, authError } from "@/lib/auth/middleware";
import { checkGlobalRateLimit, rateLimitResponse } from "@/lib/rate-limit";
import { jsonNoStore } from "@/lib/http/api-response";
import { parsePagination } from "@/lib/http/input";
import { createBounty, listBounties } from "@/lib/admin/bounties";
import { updateBehavioralVector } from "@/lib/sybil/behavioral-vectors";
import { requireAccountRole } from "@/lib/auth/authorization";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

/**
 * GET /api/v1/admin/bounties
 * List bounties.
 * Auth: tokenmart_ key. Query params: ?status=open&type=verification
 */
export async function GET(request: NextRequest) {
  const rl = await checkGlobalRateLimit(request);
  if (!rl.allowed) return rateLimitResponse();

  const auth = await authenticateRequest(request, { requiredType: ["tokenmart", "session"] });
  if (!auth.success) {
    return authError(auth.error, auth.status);
  }
  const roleCheck = await requireAccountRole(auth.context, ["admin", "super_admin"]);
  if (!roleCheck.ok) return roleCheck.response;

  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status") ?? undefined;
    const type = searchParams.get("type") ?? undefined;
    const { limit, offset } = parsePagination(searchParams, {
      defaultLimit: 50,
      maxLimit: 200,
    });

    const bounties = await listBounties({ status, type, limit, offset });
    const db = createAdminClient();
    const taskIds = [...new Set(bounties.map((bounty) => bounty.task_id).filter(Boolean))] as string[];
    const goalIds = [...new Set(bounties.map((bounty) => bounty.goal_id).filter(Boolean))] as string[];
    const [{ data: tasks }, { data: goals }] = await Promise.all([
      taskIds.length > 0
        ? db.from("tasks").select("id, title").in("id", taskIds)
        : Promise.resolve({ data: [] as Array<{ id: string; title: string }> }),
      goalIds.length > 0
        ? db.from("goals").select("id, title").in("id", goalIds)
        : Promise.resolve({ data: [] as Array<{ id: string; title: string }> }),
    ]);
    const taskMap = new Map((tasks ?? []).map((task) => [task.id, task.title]));
    const goalMap = new Map((goals ?? []).map((goal) => [goal.id, goal.title]));
    const enrichedBounties = bounties.map((bounty) => ({
      ...bounty,
      task_title: bounty.task_id ? taskMap.get(bounty.task_id) ?? null : null,
      goal_title: bounty.goal_id ? goalMap.get(bounty.goal_id) ?? null : null,
    }));

    if (auth.context.agent_id) {
      updateBehavioralVector(auth.context.agent_id, "list_bounties").catch(() => {});
    }

    return jsonNoStore({ bounties: enrichedBounties });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json(
      { error: { code: 500, message } },
      { status: 500 }
    );
  }
}

/**
 * POST /api/v1/admin/bounties
 * Create a bounty.
 * Auth: tokenmart_ key, requires account_id (admin).
 * Body: { title, description, type, credit_reward, deadline, task_id, goal_id }
 */
export async function POST(request: NextRequest) {
  const rl = await checkGlobalRateLimit(request);
  if (!rl.allowed) return rateLimitResponse();

  const auth = await authenticateRequest(request, { requiredType: ["tokenmart", "session"] });
  if (!auth.success) {
    return authError(auth.error, auth.status);
  }
  const roleCheck = await requireAccountRole(auth.context, ["admin", "super_admin"]);
  if (!roleCheck.ok) return roleCheck.response;

  let body: {
    title?: string;
    description?: string | null;
    type?: "work" | "verification";
    credit_reward?: number;
    deadline?: string | null;
    task_id?: string | null;
    goal_id?: string | null;
    metadata?: Record<string, unknown>;
    required_trust_tier?: number;
    required_service_health?: number;
    required_orchestration_score?: number;
  };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: { code: 400, message: "Invalid JSON body" } },
      { status: 400 }
    );
  }

  if (!body.title || typeof body.title !== "string") {
    return NextResponse.json(
      { error: { code: 400, message: "title is required" } },
      { status: 400 }
    );
  }

  if (!body.type || !["work", "verification"].includes(body.type)) {
    return NextResponse.json(
      { error: { code: 400, message: "type must be 'work' or 'verification'" } },
      { status: 400 }
    );
  }

  if (body.credit_reward !== undefined && (typeof body.credit_reward !== "number" || body.credit_reward < 0)) {
    return NextResponse.json(
      { error: { code: 400, message: "credit_reward must be a non-negative number" } },
      { status: 400 }
    );
  }

  try {
    const bounty = await createBounty({
      title: body.title,
      description: body.description ?? null,
      type: body.type,
      creditReward: body.credit_reward ?? 0,
      deadline: body.deadline ?? null,
      taskId: body.task_id ?? null,
      goalId: body.goal_id ?? null,
      createdBy: roleCheck.accountId,
      metadata: {
        ...(body.metadata ?? {}),
        requirements: {
          ...((body.metadata?.requirements as Record<string, unknown> | undefined) ?? {}),
          ...(typeof body.required_trust_tier === "number"
            ? { required_trust_tier: body.required_trust_tier }
            : {}),
          ...(typeof body.required_service_health === "number"
            ? { required_service_health: body.required_service_health }
            : {}),
          ...(typeof body.required_orchestration_score === "number"
            ? { required_orchestration_score: body.required_orchestration_score }
            : {}),
        },
      },
    });

    return NextResponse.json({ bounty }, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json(
      { error: { code: 500, message } },
      { status: 500 }
    );
  }
}
