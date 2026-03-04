-- ============================================================================
-- Migration: 00008_runtime_schema_reconcile.sql
-- Description: Runtime schema reconciliation for legacy deployments.
--   Adds columns that newer backend code expects to exist.
-- ============================================================================

-- TokenHall key auth expects expires_at for expiry checks.
ALTER TABLE public.tokenhall_api_keys
  ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ;

-- Keep legacy credits variants aligned with current API expectations.
ALTER TABLE public.credits
  ADD COLUMN IF NOT EXISTS account_id UUID REFERENCES accounts(id) ON DELETE SET NULL;

ALTER TABLE public.credits
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
