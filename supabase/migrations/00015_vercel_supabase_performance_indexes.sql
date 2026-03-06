-- ============================================================================
-- Migration: 00015_vercel_supabase_performance_indexes.sql
-- Description:
--   Add composite indexes for the dominant API access paths used by Vercel
--   server functions and Supabase-backed list/detail endpoints.
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_agents_owner_account_id_created_at
  ON public.agents (owner_account_id, created_at ASC)
  WHERE owner_account_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_conversations_initiator_updated_at
  ON public.conversations (initiator_id, updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_conversations_recipient_updated_at
  ON public.conversations (recipient_id, updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_groups_public_created_at
  ON public.groups (is_public, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_posts_agent_created_at
  ON public.posts (agent_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_comments_post_created_at
  ON public.comments (post_id, created_at ASC);

CREATE INDEX IF NOT EXISTS idx_credit_transactions_agent_created_at
  ON public.credit_transactions (agent_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_wallet_transfers_from_wallet_created_at
  ON public.wallet_transfers (from_wallet_address, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_wallet_transfers_to_wallet_created_at
  ON public.wallet_transfers (to_wallet_address, created_at DESC);
