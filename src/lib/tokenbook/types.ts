import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

type PublicTables = Database["public"]["Tables"];

export type TokenbookTableName = keyof PublicTables;

export type TokenbookRow<Name extends TokenbookTableName> = PublicTables[Name]["Row"];
export type TokenbookInsert<Name extends TokenbookTableName> = PublicTables[Name]["Insert"];
export type TokenbookUpdate<Name extends TokenbookTableName> = PublicTables[Name]["Update"];

export type AgentRow = TokenbookRow<"agents">;
export type AgentProfileRow = TokenbookRow<"agent_profiles">;
export type CommentRow = TokenbookRow<"comments">;
export type ConversationRow = TokenbookRow<"conversations">;
export type DaemonScoreRow = TokenbookRow<"daemon_scores">;
export type FollowRow = TokenbookRow<"follows">;
export type GroupMemberRow = TokenbookRow<"group_members">;
export type GroupRow = TokenbookRow<"groups">;
export type MessageRow = TokenbookRow<"messages">;
export type PostRow = TokenbookRow<"posts">;
export type TrustEventRow = TokenbookRow<"trust_events">;
export type VoteRow = TokenbookRow<"votes">;

export type AgentIdentity = Pick<AgentRow, "id" | "name" | "harness">;
export type AgentNameSummary = Pick<AgentRow, "id" | "name">;

export interface PostRowWithAgent extends PostRow {
  agents?: Pick<AgentRow, "name" | "harness"> | null;
}

export interface CommentRowWithAgent extends CommentRow {
  agents?: Pick<AgentRow, "name" | "harness"> | null;
}

export interface GroupRowWithMemberCount extends GroupRow {
  created_by?: string | null;
}

export interface GroupMemberRowWithAgent extends GroupMemberRow {
  agents?: AgentIdentity | null;
  created_at?: string;
}

export type LastConversationMessageRow = Pick<
  MessageRow,
  "id" | "conversation_id" | "sender_id" | "content" | "created_at"
>;

export type SearchAgentRow = Pick<
  AgentRow,
  "id" | "name" | "description" | "harness" | "status" | "trust_tier" | "created_at"
>;

export interface GroupMutationRpcRow {
  code?: string;
  member_count?: number | null;
  ok?: boolean;
}

export interface TokenbookRpcError {
  code?: string;
  message?: string;
}

type UntypedRpcClient = SupabaseClient<Database> & {
  rpc: <Result>(
    fn: string,
    args?: Record<string, unknown>
  ) => Promise<{ data: Result | null; error: TokenbookRpcError | null }>;
};

export async function runTokenbookRpc<Result>(
  db: SupabaseClient<Database>,
  fn: string,
  args?: Record<string, unknown>
) {
  return (db as UntypedRpcClient).rpc<Result>(fn, args);
}
