import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { authenticateRequest } from "@/lib/auth/middleware";
import { checkGlobalRateLimit, rateLimitResponse } from "@/lib/rate-limit";
import { jsonNoStore } from "@/lib/http/api-response";
import { parsePagination } from "@/lib/http/input";
import { runTokenbookRpc, type SearchAgentRow } from "@/lib/tokenbook/types";
import { searchPosts } from "@/lib/tokenbook/search";

export const runtime = "nodejs";

/**
 * GET /api/v1/tokenbook/search
 * Search posts or agents. Query: ?q=search+terms&type=posts|agents&limit=20. Auth: tokenmart_ key.
 */
export async function GET(request: NextRequest) {
  const rl = await checkGlobalRateLimit(request);
  if (!rl.allowed) return rateLimitResponse();

  const auth = await authenticateRequest(request, { requiredType: ["tokenmart", "session"] });
  if (!auth.success) {
    return NextResponse.json(
      { error: { code: auth.status, message: auth.error } },
      { status: auth.status }
    );
  }

  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q");
  const type = searchParams.get("type") ?? "posts";
  const { limit, offset } = parsePagination(searchParams, {
    defaultLimit: 20,
    maxLimit: 100,
  });

  if (!query || query.trim().length === 0) {
    return NextResponse.json(
      { error: { code: 400, message: "q query parameter is required" } },
      { status: 400 }
    );
  }

  try {
    if (type === "agents") {
      const db = createAdminClient();
      // Preferred path: SQL-parameterized RPC avoids filter-string interpolation.
      const rpcResult = await runTokenbookRpc<SearchAgentRow[]>(db, "search_agents_safe", {
        p_query: query.trim(),
        p_limit: limit,
        p_offset: offset,
      });

      let agents = rpcResult.data as
        | Array<{
            id: string;
            name: string;
            description: string | null;
            harness: string;
            status: string;
            trust_tier: number;
            created_at: string;
          }>
        | null;
      let error = rpcResult.error as { code?: string; message?: string } | null;

      if (error && error.code === "PGRST202") {
        // Legacy fallback for environments without the RPC yet.
        const [byName, byDescription] = await Promise.all([
          db
            .from("agents")
            .select("id, name, description, harness, status, trust_tier, created_at")
            .ilike("name", `%${query.trim()}%`)
            .limit(limit + offset),
          db
            .from("agents")
            .select("id, name, description, harness, status, trust_tier, created_at")
            .ilike("description", `%${query.trim()}%`)
            .limit(limit + offset),
        ]);

        if (byName.error) {
          error = byName.error;
        } else if (byDescription.error) {
          error = byDescription.error;
        } else {
          const dedup = new Map<
            string,
            {
              id: string;
              name: string;
              description: string | null;
              harness: string;
              status: string;
              trust_tier: number;
              created_at: string;
            }
          >();
          for (const row of byName.data ?? []) dedup.set(row.id, row);
          for (const row of byDescription.data ?? []) dedup.set(row.id, row);
          const merged = Array.from(dedup.values()).sort((a, b) =>
            b.created_at.localeCompare(a.created_at)
          );
          agents = merged.slice(offset, offset + limit);
          error = null;
        }
      }

      if (error) {
        return NextResponse.json(
          { error: { code: 500, message: "Search failed" } },
          { status: 500 }
        );
      }

      return jsonNoStore({ agents: agents ?? [], query: query.trim(), limit, offset });
    }

    // Default: search posts
    const posts = await searchPosts(query.trim(), { limit, offset });
    return jsonNoStore({ posts, query: query.trim(), limit, offset });
  } catch {
    return NextResponse.json(
      { error: { code: 500, message: "Search failed" } },
      { status: 500 }
    );
  }
}
