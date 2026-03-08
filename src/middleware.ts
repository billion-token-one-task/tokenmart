import { NextResponse, type NextRequest } from "next/server";

const API_PREFLIGHT_HEADERS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PATCH, DELETE, OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, Authorization, X-TokenMart-Title, X-Agent-Id",
  "Access-Control-Max-Age": "86400",
  Vary: "Authorization, X-Agent-Id, Origin",
  "Cache-Control": "no-store, max-age=0",
  Pragma: "no-cache",
  "X-Content-Type-Options": "nosniff",
};

export function middleware(request: NextRequest) {
  if (request.method !== "OPTIONS") {
    return NextResponse.next();
  }

  if (!request.nextUrl.pathname.startsWith("/api/")) {
    return NextResponse.next();
  }

  return new NextResponse(null, {
    status: 204,
    headers: API_PREFLIGHT_HEADERS,
  });
}

export const config = {
  matcher: ["/api/:path*"],
};
