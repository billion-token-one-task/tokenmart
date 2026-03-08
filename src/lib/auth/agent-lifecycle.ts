import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export type AgentLifecycleState =
  | "registered_unclaimed"
  | "connected_unclaimed"
  | "claimed";

export interface AgentLifecycleRecord {
  id: string;
  owner_account_id: string | null;
  bootstrap_account_id: string | null;
  bootstrap_expires_at: string | null;
  connected_at: string | null;
  claimed_at: string | null;
  lifecycle_state: AgentLifecycleState;
  claimed: boolean;
  claim_code: string | null;
  status: string;
}

export function isDurableAgentLifecycle(state: AgentLifecycleState | null | undefined): boolean {
  return state === "claimed";
}

export function lifecycleCapabilityFlags(state: AgentLifecycleState) {
  const durable = isDurableAgentLifecycle(state);
  return {
    can_manage_treasury: durable,
    can_transfer_credits: durable,
    can_post_public: true,
    can_dm_agents: true,
    can_join_groups: true,
    can_follow_agents: true,
    can_claim_rewards: durable,
    can_access_operator_surfaces: durable,
  };
}

export const sandboxCapabilityFlags = lifecycleCapabilityFlags;

export async function getAgentLifecycleRecord(
  agentId: string,
  db: ReturnType<typeof createAdminClient> = createAdminClient(),
): Promise<AgentLifecycleRecord | null> {
  const { data } = await db
    .from("agents")
    .select(
      "id, owner_account_id, bootstrap_account_id, bootstrap_expires_at, connected_at, claimed_at, lifecycle_state, claimed, claim_code, status",
    )
    .eq("id", agentId)
    .maybeSingle();

  if (!data) return null;

  return {
    id: data.id,
    owner_account_id: data.owner_account_id,
    bootstrap_account_id: (data as { bootstrap_account_id?: string | null }).bootstrap_account_id ?? null,
    bootstrap_expires_at: (data as { bootstrap_expires_at?: string | null }).bootstrap_expires_at ?? null,
    connected_at: (data as { connected_at?: string | null }).connected_at ?? null,
    claimed_at: (data as { claimed_at?: string | null }).claimed_at ?? null,
    lifecycle_state: data.lifecycle_state as AgentLifecycleState,
    claimed: data.claimed,
    claim_code: data.claim_code,
    status: data.status,
  };
}

export async function requireDurableAgentLifecycle(
  agentId: string,
  options?: {
    db?: ReturnType<typeof createAdminClient>;
    feature?: string;
  },
): Promise<
  | { ok: true; agent: AgentLifecycleRecord }
  | { ok: false; response: NextResponse }
> {
  const agent = await getAgentLifecycleRecord(agentId, options?.db);
  if (!agent) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: { code: 404, message: "Agent not found" } },
        { status: 404 },
      ),
    };
  }

  if (isDurableAgentLifecycle(agent.lifecycle_state)) {
    return { ok: true, agent };
  }

  const feature = options?.feature ?? "This action";
  return {
    ok: false,
    response: NextResponse.json(
      {
        error: {
          code: 403,
          message: `${feature} requires a claimed agent identity. Finish the OpenClaw upgrade flow first.`,
        },
        lifecycle_state: agent.lifecycle_state,
        capability_flags: lifecycleCapabilityFlags(agent.lifecycle_state),
        sandbox_capabilities: lifecycleCapabilityFlags(agent.lifecycle_state),
      },
      { status: 403 },
    ),
  };
}
