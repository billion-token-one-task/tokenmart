import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createPasswordHash } from "@/lib/auth/verify";
import { checkGlobalRateLimit, rateLimitResponse } from "@/lib/rate-limit";
import { jsonNoStore } from "@/lib/http/api-response";
import { randomBytes } from "crypto";
import { ensureAccountWallet } from "@/lib/tokenhall/wallets";
import { asTrimmedString, readJsonObject } from "@/lib/http/input";

export async function POST(request: NextRequest) {
  const rl = await checkGlobalRateLimit(request);
  if (!rl.allowed) return rateLimitResponse();

  const parsedBody = await readJsonObject<{
    email?: unknown;
    password?: unknown;
    display_name?: unknown;
  }>(request);
  if (!parsedBody.ok) {
    return NextResponse.json(
      { error: { code: 400, message: parsedBody.error } },
      { status: 400 }
    );
  }

  const email = asTrimmedString(parsedBody.data.email)?.toLowerCase() ?? null;
  const password =
    typeof parsedBody.data.password === "string"
      ? parsedBody.data.password
      : null;
  const displayName = parsedBody.data.display_name;

  if (!email || !password) {
    return NextResponse.json(
      { error: { code: 400, message: "email and password are required" } },
      { status: 400 }
    );
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return NextResponse.json(
      { error: { code: 400, message: "Invalid email format" } },
      { status: 400 }
    );
  }

  if (password.length < 8) {
    return NextResponse.json(
      { error: { code: 400, message: "Password must be at least 8 characters" } },
      { status: 400 }
    );
  }

  if (password.length > 4096) {
    return NextResponse.json(
      { error: { code: 400, message: "Password is too long" } },
      { status: 400 }
    );
  }

  const normalizedDisplayName =
    displayName === undefined ? null : asTrimmedString(displayName);
  if (displayName !== undefined && normalizedDisplayName === null) {
    return NextResponse.json(
      { error: { code: 400, message: "display_name must be a non-empty string" } },
      { status: 400 }
    );
  }

  const db = createAdminClient();

  // Check if email exists
  const { data: existing } = await db
    .from("accounts")
    .select("id")
    .eq("email", email)
    .single();

  if (existing) {
    return NextResponse.json(
      { error: { code: 409, message: "Email already registered" } },
      { status: 409 }
    );
  }

  const passwordHash = createPasswordHash(password);
  const verificationToken = randomBytes(32).toString("hex");

  const { data: account, error } = await db
    .from("accounts")
    .insert({
      email,
      password_hash: passwordHash,
      display_name: normalizedDisplayName,
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

  try {
    await ensureAccountWallet(account.id, db);
  } catch {
    await db.from("accounts").delete().eq("id", account.id);
    return NextResponse.json(
      { error: { code: 500, message: "Failed to initialize account wallet" } },
      { status: 500 }
    );
  }

  return jsonNoStore(
    {
      account_id: account.id,
      email: account.email,
      message: "Account created. Check your email for verification.",
    },
    { status: 201 }
  );
}
