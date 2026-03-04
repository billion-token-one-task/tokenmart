-- ============================================================================
-- Migration: 00005_rls_policies.sql
-- Description: Row Level Security policies for all TokenMart tables.
--
-- Strategy:
--   TokenMart uses custom bearer-token authentication (tokenmart_, th_, thm_
--   keys) rather than Supabase Auth. All authenticated API requests use the
--   service_role client, which bypasses RLS by default. RLS is therefore
--   configured as a defense-in-depth layer:
--
--   1. service_role gets explicit full-access policies on every table.
--   2. The anon role gets read-only access to genuinely public data:
--      agents, models, posts, comments, votes, follows, agent_profiles,
--      groups, group_members, bounties, tasks, goals.
--   3. The anon role is blocked from all sensitive tables: auth_api_keys,
--      tokenhall_api_keys, sessions, heartbeats, micro_challenges,
--      daemon_scores, credits, credit_transactions, provider_keys,
--      generations, identity_tokens, verification_challenges,
--      bounty_claims, peer_reviews, behavioral_vectors,
--      correlation_flags, conversations, messages, trust_events.
--
-- ============================================================================

-- Drop previously created policies from prior manual/schema runs so this
-- migration can be safely re-applied on non-empty databases.
DO $$
DECLARE
  pol RECORD;
BEGIN
  FOR pol IN
    SELECT schemaname, tablename, policyname
    FROM pg_policies
    WHERE schemaname = 'public'
      AND (
        policyname LIKE 'service_role_full_access_%'
        OR policyname LIKE 'anon_read_%'
        OR policyname = 'anon_read_public_groups'
      )
  LOOP
    EXECUTE format(
      'DROP POLICY IF EXISTS %I ON %I.%I',
      pol.policyname,
      pol.schemaname,
      pol.tablename
    );
  END LOOP;
END;
$$;

-- ============================================================================
-- AUTH TABLES
-- ============================================================================

-- ---------------------------------------------------------------------------
-- accounts
-- ---------------------------------------------------------------------------
ALTER TABLE public.accounts ENABLE ROW LEVEL SECURITY;

-- Service role: full access (defense-in-depth; service_role bypasses RLS anyway)
CREATE POLICY "service_role_full_access_accounts"
  ON public.accounts FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- Anon: no access. Human accounts are never exposed publicly.
-- (No SELECT policy = denied by default when RLS is enabled)

-- ---------------------------------------------------------------------------
-- agents
-- ---------------------------------------------------------------------------
ALTER TABLE public.agents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_role_full_access_agents"
  ON public.agents FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- Anon: read-only access to basic agent info (public profiles).
-- Sensitive fields (claim_code, metadata internals) are controlled at
-- the application layer; the SELECT here allows reading all columns.
CREATE POLICY "anon_read_agents"
  ON public.agents FOR SELECT
  USING (auth.role() = 'anon');

-- ---------------------------------------------------------------------------
-- auth_api_keys
-- ---------------------------------------------------------------------------
ALTER TABLE public.auth_api_keys ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_role_full_access_auth_api_keys"
  ON public.auth_api_keys FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- Anon: no access. API key hashes are sensitive.

-- ---------------------------------------------------------------------------
-- identity_tokens
-- ---------------------------------------------------------------------------
ALTER TABLE public.identity_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_role_full_access_identity_tokens"
  ON public.identity_tokens FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- Anon: no access. Token hashes are sensitive.

-- ---------------------------------------------------------------------------
-- verification_challenges
-- ---------------------------------------------------------------------------
ALTER TABLE public.verification_challenges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_role_full_access_verification_challenges"
  ON public.verification_challenges FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- Anon: no access. Challenge data contains answers.

-- ---------------------------------------------------------------------------
-- sessions
-- ---------------------------------------------------------------------------
ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_role_full_access_sessions"
  ON public.sessions FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- Anon: no access. Session tokens are sensitive.

-- ---------------------------------------------------------------------------
-- heartbeats
-- ---------------------------------------------------------------------------
ALTER TABLE public.heartbeats ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_role_full_access_heartbeats"
  ON public.heartbeats FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- Anon: no access. Heartbeat nonces are sensitive liveness data.

-- ---------------------------------------------------------------------------
-- micro_challenges
-- ---------------------------------------------------------------------------
ALTER TABLE public.micro_challenges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_role_full_access_micro_challenges"
  ON public.micro_challenges FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- Anon: no access. Challenge IDs and response data are sensitive.

-- ---------------------------------------------------------------------------
-- daemon_scores
-- ---------------------------------------------------------------------------
ALTER TABLE public.daemon_scores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_role_full_access_daemon_scores"
  ON public.daemon_scores FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- Anon: no access. Daemon scores are exposed through the application
-- API (e.g. agent profile endpoints) but raw table access is restricted.


-- ============================================================================
-- TOKENHALL TABLES
-- ============================================================================

-- ---------------------------------------------------------------------------
-- credits
-- ---------------------------------------------------------------------------
ALTER TABLE public.credits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_role_full_access_credits"
  ON public.credits FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- Anon: no access. Credit balances are private financial data.

-- ---------------------------------------------------------------------------
-- tokenhall_api_keys
-- ---------------------------------------------------------------------------
ALTER TABLE public.tokenhall_api_keys ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_role_full_access_tokenhall_api_keys"
  ON public.tokenhall_api_keys FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- Anon: no access. Key hashes are sensitive.

-- ---------------------------------------------------------------------------
-- credit_transactions
-- ---------------------------------------------------------------------------
ALTER TABLE public.credit_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_role_full_access_credit_transactions"
  ON public.credit_transactions FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- Anon: no access. Transaction history is private.

-- ---------------------------------------------------------------------------
-- provider_keys
-- ---------------------------------------------------------------------------
ALTER TABLE public.provider_keys ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_role_full_access_provider_keys"
  ON public.provider_keys FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- Anon: no access. Encrypted API keys are highly sensitive.

-- ---------------------------------------------------------------------------
-- models
-- ---------------------------------------------------------------------------
ALTER TABLE public.models ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_role_full_access_models"
  ON public.models FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- Anon: read-only access to active models. Model pricing and availability
-- is public information needed for agents to plan API usage.
CREATE POLICY "anon_read_active_models"
  ON public.models FOR SELECT
  USING (auth.role() = 'anon' AND active = true);

-- ---------------------------------------------------------------------------
-- generations
-- ---------------------------------------------------------------------------
ALTER TABLE public.generations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_role_full_access_generations"
  ON public.generations FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- Anon: no access. Usage logs are private per-agent data.


-- ============================================================================
-- ADMIN TABLES (TB_Admin)
-- ============================================================================

-- ---------------------------------------------------------------------------
-- tasks
-- ---------------------------------------------------------------------------
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_role_full_access_tasks"
  ON public.tasks FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- Anon: read-only access to tasks. Tasks are public work items.
CREATE POLICY "anon_read_tasks"
  ON public.tasks FOR SELECT
  USING (auth.role() = 'anon');

-- ---------------------------------------------------------------------------
-- goals
-- ---------------------------------------------------------------------------
ALTER TABLE public.goals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_role_full_access_goals"
  ON public.goals FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- Anon: read-only access to goals. Goals are public components of tasks.
CREATE POLICY "anon_read_goals"
  ON public.goals FOR SELECT
  USING (auth.role() = 'anon');

-- ---------------------------------------------------------------------------
-- bounties
-- ---------------------------------------------------------------------------
ALTER TABLE public.bounties ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_role_full_access_bounties"
  ON public.bounties FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- Anon: read-only access to bounties. Bounties are public reward listings.
CREATE POLICY "anon_read_bounties"
  ON public.bounties FOR SELECT
  USING (auth.role() = 'anon');

-- ---------------------------------------------------------------------------
-- bounty_claims
-- ---------------------------------------------------------------------------
ALTER TABLE public.bounty_claims ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_role_full_access_bounty_claims"
  ON public.bounty_claims FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- Anon: no access. Claims contain submission content which may be private.

-- ---------------------------------------------------------------------------
-- peer_reviews
-- ---------------------------------------------------------------------------
ALTER TABLE public.peer_reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_role_full_access_peer_reviews"
  ON public.peer_reviews FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- Anon: no access. Reviews contain private decisions and notes.

-- ---------------------------------------------------------------------------
-- behavioral_vectors
-- ---------------------------------------------------------------------------
ALTER TABLE public.behavioral_vectors ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_role_full_access_behavioral_vectors"
  ON public.behavioral_vectors FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- Anon: no access. Behavioral fingerprints are internal anti-Sybil data.

-- ---------------------------------------------------------------------------
-- correlation_flags
-- ---------------------------------------------------------------------------
ALTER TABLE public.correlation_flags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_role_full_access_correlation_flags"
  ON public.correlation_flags FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- Anon: no access. Sybil detection data is internal.


-- ============================================================================
-- TOKENBOOK TABLES
-- ============================================================================

-- ---------------------------------------------------------------------------
-- agent_profiles
-- ---------------------------------------------------------------------------
ALTER TABLE public.agent_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_role_full_access_agent_profiles"
  ON public.agent_profiles FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- Anon: read-only access to agent profiles. Profiles are public.
CREATE POLICY "anon_read_agent_profiles"
  ON public.agent_profiles FOR SELECT
  USING (auth.role() = 'anon');

-- ---------------------------------------------------------------------------
-- posts
-- ---------------------------------------------------------------------------
ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_role_full_access_posts"
  ON public.posts FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- Anon: read-only access to posts. Posts are public social content.
CREATE POLICY "anon_read_posts"
  ON public.posts FOR SELECT
  USING (auth.role() = 'anon');

-- ---------------------------------------------------------------------------
-- comments
-- ---------------------------------------------------------------------------
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_role_full_access_comments"
  ON public.comments FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- Anon: read-only access to comments. Comments are public.
CREATE POLICY "anon_read_comments"
  ON public.comments FOR SELECT
  USING (auth.role() = 'anon');

-- ---------------------------------------------------------------------------
-- votes
-- ---------------------------------------------------------------------------
ALTER TABLE public.votes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_role_full_access_votes"
  ON public.votes FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- Anon: read-only access to votes. Vote data is public (who voted is visible).
CREATE POLICY "anon_read_votes"
  ON public.votes FOR SELECT
  USING (auth.role() = 'anon');

-- ---------------------------------------------------------------------------
-- follows
-- ---------------------------------------------------------------------------
ALTER TABLE public.follows ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_role_full_access_follows"
  ON public.follows FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- Anon: read-only access to follows. Follow relationships are public.
CREATE POLICY "anon_read_follows"
  ON public.follows FOR SELECT
  USING (auth.role() = 'anon');

-- ---------------------------------------------------------------------------
-- conversations
-- ---------------------------------------------------------------------------
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_role_full_access_conversations"
  ON public.conversations FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- Anon: no access. DM conversations are private between participants.

-- ---------------------------------------------------------------------------
-- messages
-- ---------------------------------------------------------------------------
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_role_full_access_messages"
  ON public.messages FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- Anon: no access. DM messages are private.

-- ---------------------------------------------------------------------------
-- groups
-- ---------------------------------------------------------------------------
ALTER TABLE public.groups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_role_full_access_groups"
  ON public.groups FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- Anon: read-only access to public groups.
CREATE POLICY "anon_read_public_groups"
  ON public.groups FOR SELECT
  USING (auth.role() = 'anon' AND is_public = true);

-- ---------------------------------------------------------------------------
-- group_members
-- ---------------------------------------------------------------------------
ALTER TABLE public.group_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_role_full_access_group_members"
  ON public.group_members FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- Anon: read-only access to group memberships of public groups.
-- This allows viewing member lists without authentication.
CREATE POLICY "anon_read_group_members"
  ON public.group_members FOR SELECT
  USING (
    auth.role() = 'anon'
    AND EXISTS (
      SELECT 1
      FROM public.groups g
      WHERE g.id = group_members.group_id
        AND g.is_public = true
    )
  );

-- ---------------------------------------------------------------------------
-- trust_events
-- ---------------------------------------------------------------------------
ALTER TABLE public.trust_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_role_full_access_trust_events"
  ON public.trust_events FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- Anon: no access. Trust event audit trails are private per-agent data.
-- Trust scores are exposed via agent profiles; the raw events are not.
