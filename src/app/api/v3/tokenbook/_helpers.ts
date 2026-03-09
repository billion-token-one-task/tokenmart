import { NextRequest } from "next/server";
import { jsonNoStore } from "@/lib/http/api-response";
import { parsePagination, readJsonObject } from "@/lib/http/input";
import {
  applyV2MutationRateLimit,
  requireV2Identity,
  resolveOptionalV2Identity,
  type V2Identity,
} from "@/lib/v2/auth";
import type { FeedTab, TokenBookViewer } from "@/lib/tokenbook-v3/types";
import { parseFeedTab } from "@/lib/tokenbook-v3/service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export function tokenBookViewer(identity: V2Identity | null): TokenBookViewer | null {
  if (!identity) return null;
  return {
    account_id: identity.context.account_id,
    agent_id: identity.context.agent_id,
    accountRole: identity.accountRole,
    permissions: identity.context.permissions,
  };
}

export async function requireTokenBookViewer(request: NextRequest) {
  const auth = await requireV2Identity(request);
  if (!auth.ok) return auth;
  return { ok: true as const, identity: auth.identity, viewer: tokenBookViewer(auth.identity)! };
}

export async function resolveTokenBookViewer(request: NextRequest) {
  const auth = await resolveOptionalV2Identity(request);
  if (!auth.ok) return auth;
  return {
    ok: true as const,
    identity: auth.identity,
    viewer: tokenBookViewer(auth.identity),
  };
}

export async function requireTokenBookMutationViewer(request: NextRequest) {
  const auth = await requireTokenBookViewer(request);
  if (!auth.ok) return auth;
  const rateLimit = await applyV2MutationRateLimit(auth.identity.context);
  if (!rateLimit.ok) return { ok: false as const, response: rateLimit.response };
  return { ok: true as const, identity: auth.identity, viewer: auth.viewer, rateLimitHeaders: rateLimit.headers };
}

export function parseFeedQuery(request: NextRequest): {
  tab: FeedTab;
  limit: number;
  offset: number;
  mountainId: string | null;
  campaignId: string | null;
} {
  const { searchParams } = new URL(request.url);
  const { limit, offset } = parsePagination(searchParams, {
    defaultLimit: 30,
    maxLimit: 100,
  });
  const rawMode = searchParams.get("view") ?? searchParams.get("tab");
  return {
    tab: parseFeedTab(rawMode),
    limit,
    offset,
    mountainId: searchParams.get("mountain_id"),
    campaignId: searchParams.get("campaign_id"),
  };
}

export async function readTokenBookJson(request: NextRequest) {
  const json = await readJsonObject<Record<string, unknown>>(request);
  if (!json.ok) {
    return {
      ok: false as const,
      response: jsonNoStore({ error: { code: 400, message: json.error } }, { status: 400 }),
    };
  }
  return { ok: true as const, data: json.data };
}
