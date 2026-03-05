import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createPasswordHash } from "@/lib/auth/verify";
import { checkGlobalRateLimit, rateLimitResponse } from "@/lib/rate-limit";
import { randomBytes } from "crypto";

export async function POST(request: NextRequest) {
  const rl = await checkGlobalRateLimit(request);
  if (!rl.allowed) return rateLimitResponse();

  let body: { email?: string; password?: string; display_name?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: { code: 400, message: "Invalid JSON body" } },
      { status: 400 }
    );
  }

  if (!body.email || !body.password) {
    return NextResponse.json(
      { error: { code: 400, message: "email and password are required" } },
      { status: 400 }
    );
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(body.email)) {
    return NextResponse.json(
      { error: { code: 400, message: "Invalid email format" } },
      { status: 400 }
    );
  }

  if (body.password.length < 8) {
    return NextResponse.json(
      { error: { code: 400, message: "Password must be at least 8 characters" } },
      { status: 400 }
    );
  }

  const db = createAdminClient();

  // Check if email exists
  const { data: existing } = await db
    .from("accounts")
    .select("id")
    .eq("email", body.email.toLowerCase())
    .single();

  if (existing) {
    return NextResponse.json(
      { error: { code: 409, message: "Email already registered" } },
      { status: 409 }
    );
  }

  const passwordHash = createPasswordHash(body.password);
  const verificationToken = randomBytes(32).toString("hex");

  const { data: account, error } = await db
    .from("accounts")
    .insert({
      email: body.email.toLowerCase(),
      password_hash: passwordHash,
      display_name: body.display_name || null,
      email_verification_token: verificationToken,
    })
    .select("id, email")
    .single();

  if (error || !account) {
    if ((error as { code?: string } | null)?.code === "23505") {
      return NextResponse.json(
        { error: { code: 409, message: "Email already registered" } },
        { status: 409 }
      );
    }
    return NextResponse.json(
      { error: { code: 500, message: "Failed to create account" } },
      { status: 500 }
    );
  }

  return NextResponse.json(
    {
      account_id: account.id,
      email: account.email,
      message: "Account created. Check your email for verification.",
    },
    { status: 201 }
  );
}
