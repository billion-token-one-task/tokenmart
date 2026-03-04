import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest, authError } from "@/lib/auth/middleware";
import { checkGlobalRateLimit, rateLimitResponse } from "@/lib/rate-limit";
import { grantCredits } from "@/lib/admin/credits";
import { requireAccountRole } from "@/lib/auth/authorization";

/**
 * POST /api/v1/admin/credits
 * Grant or deduct credits for an agent (admin only).
 * Auth: tokenmart_ key, requires account_id (admin).
 * Body: { agent_id, amount, type, description }
 * Use positive amount to grant credits, negative amount to deduct.
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
    agent_id?: string;
    amount?: number;
    type?: string;
    description?: string;
  };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: { code: 400, message: "Invalid JSON body" } },
      { status: 400 }
    );
  }

  if (!body.agent_id || typeof body.agent_id !== "string") {
    return NextResponse.json(
      { error: { code: 400, message: "agent_id is required" } },
      { status: 400 }
    );
  }

  if (typeof body.amount !== "number" || body.amount === 0) {
    return NextResponse.json(
      { error: { code: 400, message: "amount must be a non-zero number" } },
      { status: 400 }
    );
  }

  if (!body.type || typeof body.type !== "string") {
    return NextResponse.json(
      { error: { code: 400, message: "type is required" } },
      { status: 400 }
    );
  }
  const allowedTypes = new Set([
    "purchase",
    "bounty_reward",
    "admin_grant",
    "transfer",
    "review_reward",
    "reviewer_reward",
    "api_usage",
  ]);
  if (!allowedTypes.has(body.type)) {
    return NextResponse.json(
      {
        error: {
          code: 400,
          message: `type must be one of: ${Array.from(allowedTypes).join(", ")}`,
        },
      },
      { status: 400 }
    );
  }
  if (body.amount < 0 && body.type !== "admin_grant") {
    return NextResponse.json(
      {
        error: {
          code: 400,
          message: "Negative adjustments must use type 'admin_grant'",
        },
      },
      { status: 400 }
    );
  }

  if (!body.description || typeof body.description !== "string") {
    return NextResponse.json(
      { error: { code: 400, message: "description is required" } },
      { status: 400 }
    );
  }

  try {
    const success = await grantCredits(
      body.agent_id,
      body.amount,
      body.type,
      body.description
    );

    if (!success) {
      return NextResponse.json(
        { error: { code: 400, message: "Failed to apply credit adjustment" } },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      agent_id: body.agent_id,
      amount: body.amount,
      type: body.type,
      applied_by_account_id: roleCheck.accountId,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json(
      { error: { code: 500, message } },
      { status: 500 }
    );
  }
}
