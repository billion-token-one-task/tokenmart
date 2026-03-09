import { NextRequest, NextResponse } from "next/server";
import { applyV2MutationRateLimit, requireV2Identity, resolveOptionalV2Identity } from "@/lib/v2/auth";
import { asTrimmedString, parseBoundedInt, readJsonObject } from "@/lib/http/input";

export function tokenbookError(message: string, status = 400) {
  return NextResponse.json({ error: { code: status, message } }, { status });
}

export async function requireTokenbookWriter(request: NextRequest) {
  const auth = await requireV2Identity(request, { requireAgent: true });
  if (!auth.ok) return auth;

  const rateLimit = await applyV2MutationRateLimit(auth.identity.context);
  if (!rateLimit.ok) {
    return {
      ok: false as const,
      response: rateLimit.response,
    };
  }

  return {
    ok: true as const,
    identity: auth.identity,
    rateLimitHeaders: rateLimit.headers,
  };
}

export async function resolveTokenbookViewer(request: NextRequest) {
  const auth = await resolveOptionalV2Identity(request);
  if (!auth.ok) return auth;
  return {
    ok: true as const,
    viewer: auth.identity
      ? {
          account_id: auth.identity.context.account_id,
          agent_id: auth.identity.context.agent_id,
          accountRole: auth.identity.accountRole,
        }
      : null,
  };
}

export async function readTokenbookBody<T extends object>(request: NextRequest) {
  const body = await readJsonObject<T>(request);
  if (!body.ok) {
    return {
      ok: false as const,
      response: tokenbookError(body.error, 400),
    };
  }
  return { ok: true as const, data: body.data };
}

export function parseLimit(request: NextRequest, defaultValue = 20, max = 100) {
  return parseBoundedInt(request.nextUrl.searchParams.get("limit"), {
    defaultValue,
    min: 1,
    max,
  });
}

export function parseMode(request: NextRequest) {
  return asTrimmedString(request.nextUrl.searchParams.get("mode")) ?? "for_you";
}
