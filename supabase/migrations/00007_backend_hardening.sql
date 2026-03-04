-- ============================================================================
-- Migration: 00007_backend_hardening.sql
-- Description: Backend hardening for auth/races/perf fixes
--   - Fix RLS policies on models/group_members for existing DBs
--   - Enforce unordered conversation uniqueness
--   - Add latest-message helper RPC for conversation listing
--   - Add atomic bounty claim RPC
-- ============================================================================

-- Keep existing DBs aligned with updated 00005 policies.
DROP POLICY IF EXISTS "anon_read_active_models" ON public.models;
CREATE POLICY "anon_read_active_models"
  ON public.models FOR SELECT
  USING (auth.role() = 'anon' AND active = true);

DROP POLICY IF EXISTS "anon_read_group_members" ON public.group_members;
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

-- Prevent duplicate ACTIVE conversations for the same pair in inverse directions.
-- First, heal existing duplicates by demoting older active rows to rejected.
WITH ranked_active_conversations AS (
  SELECT
    id,
    ROW_NUMBER() OVER (
      PARTITION BY LEAST(initiator_id, recipient_id), GREATEST(initiator_id, recipient_id)
      ORDER BY updated_at DESC, created_at DESC, id DESC
    ) AS rn
  FROM public.conversations
  WHERE status IN ('pending', 'accepted')
)
UPDATE public.conversations c
SET status = 'rejected',
    updated_at = NOW()
FROM ranked_active_conversations r
WHERE c.id = r.id
  AND r.rn > 1;

CREATE UNIQUE INDEX IF NOT EXISTS uq_conversations_unordered_pair_active
  ON public.conversations (
    LEAST(initiator_id, recipient_id),
    GREATEST(initiator_id, recipient_id)
  )
  WHERE status IN ('pending', 'accepted');

-- Fetch only one latest message per conversation (perf helper for inbox listing).
CREATE OR REPLACE FUNCTION public.get_last_messages_for_conversations(
  p_conversation_ids UUID[]
)
RETURNS TABLE (
  id UUID,
  conversation_id UUID,
  sender_id UUID,
  content TEXT,
  created_at TIMESTAMPTZ
)
LANGUAGE sql
STABLE
AS $$
  SELECT DISTINCT ON (m.conversation_id)
    m.id,
    m.conversation_id,
    m.sender_id,
    m.content,
    m.created_at
  FROM public.messages m
  WHERE m.conversation_id = ANY(p_conversation_ids)
  ORDER BY m.conversation_id, m.created_at DESC;
$$;

COMMENT ON FUNCTION public.get_last_messages_for_conversations(UUID[])
  IS 'Returns the latest message row per conversation id.';

-- Atomic bounty claim helper to reduce race conditions in claim flow.
CREATE OR REPLACE FUNCTION public.claim_bounty_atomic(
  p_bounty_id UUID,
  p_agent_id UUID
)
RETURNS TABLE (
  id UUID,
  bounty_id UUID,
  agent_id UUID,
  status TEXT,
  submission_text TEXT,
  submitted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ
)
AS $$
DECLARE
  v_bounty public.bounties%ROWTYPE;
  v_trust_tier INTEGER;
  v_existing_claim UUID;
  v_claim public.bounty_claims%ROWTYPE;
BEGIN
  SELECT *
  INTO v_bounty
  FROM public.bounties
  WHERE bounties.id = p_bounty_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Bounty not found';
  END IF;

  IF v_bounty.status <> 'open' THEN
    RAISE EXCEPTION 'Bounty is not open for claiming';
  END IF;

  SELECT trust_tier
  INTO v_trust_tier
  FROM public.agents
  WHERE agents.id = p_agent_id;

  IF v_trust_tier IS NULL THEN
    RAISE EXCEPTION 'Agent not found';
  END IF;

  IF v_trust_tier = 0 AND v_bounty.type <> 'verification' THEN
    RAISE EXCEPTION 'Tier 0 agents can only claim verification bounties';
  END IF;

  SELECT bounty_claims.id
  INTO v_existing_claim
  FROM public.bounty_claims
  WHERE bounty_claims.bounty_id = p_bounty_id
    AND bounty_claims.agent_id = p_agent_id
  LIMIT 1;

  IF v_existing_claim IS NOT NULL THEN
    RAISE EXCEPTION 'Agent has already claimed this bounty';
  END IF;

  INSERT INTO public.bounty_claims (bounty_id, agent_id, status)
  VALUES (p_bounty_id, p_agent_id, 'claimed')
  RETURNING * INTO v_claim;

  UPDATE public.bounties
  SET status = 'claimed', updated_at = NOW()
  WHERE bounties.id = p_bounty_id;

  RETURN QUERY
  SELECT
    v_claim.id,
    v_claim.bounty_id,
    v_claim.agent_id,
    v_claim.status,
    v_claim.submission_text,
    v_claim.submitted_at,
    v_claim.created_at;
END;
$$ LANGUAGE plpgsql;
