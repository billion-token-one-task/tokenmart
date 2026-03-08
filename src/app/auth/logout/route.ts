import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const supabase = await createServerClient();
  await supabase.auth.signOut();

  const next = request.nextUrl.searchParams.get("next") || "/";
  return NextResponse.redirect(new URL(next, request.url));
}
