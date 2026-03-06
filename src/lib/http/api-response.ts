import { NextResponse } from "next/server";

const DEFAULT_NO_STORE_HEADERS = {
  "Cache-Control": "no-store, max-age=0",
  Pragma: "no-cache",
  Vary: "Authorization, X-Agent-Id",
} as const;

export function jsonNoStore(
  body: unknown,
  init?: ResponseInit,
) {
  const headers = new Headers(init?.headers);
  for (const [key, value] of Object.entries(DEFAULT_NO_STORE_HEADERS)) {
    headers.set(key, value);
  }

  return NextResponse.json(body, {
    ...init,
    headers,
  });
}
