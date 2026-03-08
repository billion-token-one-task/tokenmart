import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { ensureAccountForSupabaseUser } from "@/lib/auth/supabase-bridge";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const next = url.searchParams.get("next") || "/connect/openclaw";
  const redirectUrl = new URL(next, `${url.protocol}//${url.host}`);

  if (!code) {
    return NextResponse.redirect(redirectUrl);
  }

  const supabase = await createServerClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    redirectUrl.searchParams.set("auth_error", error.message);
    return NextResponse.redirect(redirectUrl);
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    await ensureAccountForSupabaseUser(user, createAdminClient());
  }

  return NextResponse.redirect(redirectUrl);
}
