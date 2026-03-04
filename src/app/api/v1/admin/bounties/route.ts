import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest, authError } from "@/lib/auth/middleware";
import { checkGlobalRateLimit, rateLimitResponse } from "@/lib/rate-limit";
import { createBounty, listBounties } from "@/lib/admin/bounties";
import { updateBehavioralVector } from "@/lib/sybil/behavioral-vectors";
import { requireAccountRole } from "@/lib/auth/authorization";

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
    const limit = searchParams.get("limit")
      ? parseInt(searchParams.get("limit")!, 10)
      : undefined;
    const offset = searchParams.get("offset")
      ? parseInt(searchParams.get("offset")!, 10)
      : undefined;

    const bounties = await listBounties({ status, type, limit, offset });

    if (auth.context.agent_id) {
      updateBehavioralVector(auth.context.agent_id, "list_bounties").catch(() => {});
    }

    return NextResponse.json({ bounties });
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
