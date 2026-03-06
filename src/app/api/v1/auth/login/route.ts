import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createPasswordHash, verifyPasswordHash } from "@/lib/auth/verify";
import { checkGlobalRateLimit, rateLimitResponse } from "@/lib/rate-limit";
import { jsonNoStore } from "@/lib/http/api-response";
import { randomBytes } from "crypto";
import { asTrimmedString, readJsonObject } from "@/lib/http/input";

export async function POST(request: NextRequest) {
  const rl = await checkGlobalRateLimit(request);
  if (!rl.allowed) return rateLimitResponse();

  const parsedBody = await readJsonObject<{
    email?: unknown;
    password?: unknown;
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

  if (!email || !password) {
    return NextResponse.json(
      { error: { code: 400, message: "email and password are required" } },
      { status: 400 }
    );
  }

  const db = createAdminClient();

  const { data: account } = await db
    .from("accounts")
    .select("id, email, password_hash, role, display_name")
    .eq("email", email)
    .single();

  if (!account) {
    return NextResponse.json(
      { error: { code: 401, message: "Invalid email or password" } },
      { status: 401 }
    );
  }

  const passwordCheck = verifyPasswordHash(password, account.password_hash);
  if (!passwordCheck.valid) {
    return NextResponse.json(
      { error: { code: 401, message: "Invalid email or password" } },
      { status: 401 }
    );
  }

  // Seamless upgrade from legacy SHA-256 hashes to scrypt_v2.
  if (passwordCheck.needsRehash) {
    void (async () => {
      try {
        await db
          .from("accounts")
          .update({ password_hash: createPasswordHash(password) })
          .eq("id", account.id);
      } catch {
        // Best-effort rehash upgrade.
      }
    })();
  }

  // Create session
  const refreshToken = randomBytes(32).toString("hex");
  const refreshTokenHash = (await import("@/lib/auth/keys")).hashKey(
    refreshToken
  );

  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 30); // 30 day session

  const { error: sessionError } = await db.from("sessions").insert({
    account_id: account.id,
    refresh_token_hash: refreshTokenHash,
    user_agent: request.headers.get("user-agent"),
    ip_address: request.headers.get("x-forwarded-for")?.split(",")[0]?.trim(),
    expires_at: expiresAt.toISOString(),
  });

  if (sessionError) {
    return NextResponse.json(
      { error: { code: 500, message: "Failed to create session" } },
      { status: 500 }
    );
  }

  return jsonNoStore({
    account: {
      id: account.id,
      email: account.email,
      role: account.role,
      display_name: account.display_name,
    },
    refresh_token: refreshToken,
    expires_at: expiresAt.toISOString(),
  });
}
