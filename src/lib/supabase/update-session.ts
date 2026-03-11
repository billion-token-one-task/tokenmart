import { createServerClient } from "@supabase/ssr";
import { NextRequest, NextResponse } from "next/server";
import type { Database } from "@/types/database";

const API_PREFLIGHT_HEADERS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PATCH, DELETE, OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, Authorization, X-TokenMart-Title, X-Agent-Id, X-TokenBook-Workspace-Fingerprint, X-TokenBook-Bridge-Version, X-TokenBook-Cron-Health, X-TokenBook-Hook-Health, X-OpenClaw-Profile, X-OpenClaw-Workspace-Path, X-OpenClaw-Home, X-OpenClaw-Version",
  "Access-Control-Max-Age": "86400",
  Vary: "Authorization, X-Agent-Id, Origin",
  "Cache-Control": "no-store, max-age=0",
  Pragma: "no-cache",
  "X-Content-Type-Options": "nosniff",
};

function isStaticAsset(pathname: string) {
  return (
    pathname.startsWith("/_next/") ||
    pathname === "/favicon.ico" ||
    /\.[a-z0-9]+$/i.test(pathname)
  );
}

export async function updateSupabaseSession(request: NextRequest) {
  const { pathname, searchParams } = request.nextUrl;
  if (pathname === "/login" || pathname === "/register" || pathname === "/agent-register") {
    return NextResponse.redirect(new URL("/connect/runtime", request.url));
  }

  if (pathname === "/claim") {
    const claimCode = searchParams.get("claim_code")?.trim() || searchParams.get("code")?.trim() || "";
    const redirectUrl = new URL("/connect/runtime", request.url);
    if (claimCode) {
      redirectUrl.searchParams.set("claim_code", claimCode);
    }
    return NextResponse.redirect(redirectUrl);
  }

  if (request.method === "OPTIONS" && request.nextUrl.pathname.startsWith("/api/")) {
    return new NextResponse(null, {
      status: 204,
      headers: API_PREFLIGHT_HEADERS,
    });
  }

  if (request.nextUrl.pathname.startsWith("/api/") || isStaticAsset(request.nextUrl.pathname)) {
    return NextResponse.next();
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    return NextResponse.next();
  }

  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const supabase = createServerClient<Database>(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({
          request: {
            headers: request.headers,
          },
        });
        cookiesToSet.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, options);
        });
      },
    },
  });

  await supabase.auth.getUser();
  return response;
}
