-- ============================================================================
-- Migration: 00009_comprehensive_backend_hardening.sql
-- Description: Comprehensive runtime hardening and race-proofing
--   - provider_keys scope invariants + uniqueness
--   - tokenhall_api_keys spent_credits tracking
--   - atomic deduct_credits_with_key_limit RPC
--   - key usage stats aggregation RPC
--   - safe agent search RPC
--   - atomic group join/leave RPCs
-- ============================================================================

-- ---------------------------------------------------------------------------
-- provider_keys hardening
-- ---------------------------------------------------------------------------

-- Normalize provider names to lowercase.
UPDATE public.provider_keys
SET provider = lower(provider)
WHERE provider IS NOT NULL
  AND provider <> lower(provider);

-- If both scopes are populated, keep agent scope as the more specific one.
UPDATE public.provider_keys
SET account_id = NULL
WHERE agent_id IS NOT NULL
  AND account_id IS NOT NULL;

-- Remove invalid rows with no scope.
DELETE FROM public.provider_keys
WHERE agent_id IS NULL
  AND account_id IS NULL;

-- Deduplicate scoped keys (keep newest row per scope/provider).
WITH ranked_agent_scope AS (
  SELECT
    id,
    ROW_NUMBER() OVER (
      PARTITION BY provider, agent_id
      ORDER BY created_at DESC, id DESC
    ) AS rn
  FROM public.provider_keys
  WHERE agent_id IS NOT NULL
    AND account_id IS NULL
),
ranked_account_scope AS (
  SELECT
    id,
    ROW_NUMBER() OVER (
      PARTITION BY provider, account_id
      ORDER BY created_at DESC, id DESC
    ) AS rn
  FROM public.provider_keys
  WHERE account_id IS NOT NULL
    AND agent_id IS NULL
)
DELETE FROM public.provider_keys
WHERE id IN (
  SELECT id FROM ranked_agent_scope WHERE rn > 1
  UNION ALL
  SELECT id FROM ranked_account_scope WHERE rn > 1
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'chk_provider_keys_exactly_one_scope'
      AND conrelid = 'public.provider_keys'::regclass
  ) THEN
    ALTER TABLE public.provider_keys
      ADD CONSTRAINT chk_provider_keys_exactly_one_scope
      CHECK (
        (agent_id IS NOT NULL AND account_id IS NULL)
        OR
        (agent_id IS NULL AND account_id IS NOT NULL)
      );
  END IF;
END;
$$;

CREATE UNIQUE INDEX IF NOT EXISTS uq_provider_keys_provider_agent_scope
  ON public.provider_keys (provider, agent_id)
  WHERE agent_id IS NOT NULL
    AND account_id IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_provider_keys_provider_account_scope
  ON public.provider_keys (provider, account_id)
  WHERE account_id IS NOT NULL
    AND agent_id IS NULL;

-- ---------------------------------------------------------------------------
-- tokenhall_api_keys spent_credits tracking
-- ---------------------------------------------------------------------------

ALTER TABLE public.tokenhall_api_keys
  ADD COLUMN IF NOT EXISTS spent_credits DECIMAL(20,8) DEFAULT 0;

ALTER TABLE public.tokenhall_api_keys
  ALTER COLUMN spent_credits SET DEFAULT 0;

WITH usage_totals AS (
  SELECT
    tokenhall_key_id,
    COALESCE(SUM(total_cost), 0)::DECIMAL(20,8) AS total_cost
  FROM public.generations
  WHERE status = 'success'
  GROUP BY tokenhall_key_id
)
UPDATE public.tokenhall_api_keys k
SET spent_credits = u.total_cost
FROM usage_totals u
WHERE k.id = u.tokenhall_key_id;

UPDATE public.tokenhall_api_keys
SET spent_credits = 0
WHERE spent_credits IS NULL;

ALTER TABLE public.tokenhall_api_keys
  ALTER COLUMN spent_credits SET NOT NULL;

-- ---------------------------------------------------------------------------
-- Atomic credit deduction with key-limit enforcement
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.deduct_credits_with_key_limit(
  p_agent_id UUID,
  p_key_id UUID,
  p_amount DECIMAL,
  p_description TEXT DEFAULT NULL,
  p_reference_id TEXT DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
  v_balance DECIMAL;
  v_credit_limit DECIMAL;
  v_spent DECIMAL;
  v_revoked BOOLEAN;
BEGIN
  IF p_amount IS NULL OR p_amount <= 0 THEN
    RETURN FALSE;
  END IF;

  SELECT balance
  INTO v_balance
  FROM public.credits
  WHERE agent_id = p_agent_id
  FOR UPDATE;

  IF v_balance IS NULL THEN
    RETURN FALSE;
  END IF;

  SELECT credit_limit, spent_credits, revoked
  INTO v_credit_limit, v_spent, v_revoked
  FROM public.tokenhall_api_keys
  WHERE id = p_key_id
    AND agent_id = p_agent_id
  FOR UPDATE;

  IF v_spent IS NULL THEN
    RETURN FALSE;
  END IF;

  IF COALESCE(v_revoked, FALSE) THEN
    RETURN FALSE;
  END IF;

  IF v_credit_limit IS NOT NULL THEN
    IF v_credit_limit <= 0 THEN
      RETURN FALSE;
    END IF;

    IF v_spent + p_amount > v_credit_limit THEN
      RETURN FALSE;
    END IF;
  END IF;

  IF v_balance < p_amount THEN
    RETURN FALSE;
  END IF;

  UPDATE public.credits
  SET balance = balance - p_amount,
      total_spent = total_spent + p_amount,
      updated_at = NOW()
  WHERE agent_id = p_agent_id;

  UPDATE public.tokenhall_api_keys
  SET spent_credits = spent_credits + p_amount
  WHERE id = p_key_id;

  INSERT INTO public.credit_transactions (agent_id, type, amount, description, reference_id)
  VALUES (p_agent_id, 'api_usage', -p_amount, p_description, p_reference_id);

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION public.deduct_credits_with_key_limit(UUID, UUID, DECIMAL, TEXT, TEXT)
  IS 'Atomically deducts credits and enforces tokenhall_api_keys.credit_limit using spent_credits.';

-- ---------------------------------------------------------------------------
-- Key usage stats RPC (aggregation in SQL)
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.get_key_usage_stats(
  p_key_id UUID
)
RETURNS TABLE (
  total_requests BIGINT,
  completed_requests BIGINT,
  error_requests BIGINT,
  total_input_tokens BIGINT,
  total_output_tokens BIGINT,
  total_cost DECIMAL(20,8)
)
LANGUAGE sql
STABLE
AS $$
  SELECT
    COUNT(*)::BIGINT AS total_requests,
    COUNT(*) FILTER (WHERE g.status = 'success')::BIGINT AS completed_requests,
    COUNT(*) FILTER (WHERE g.status = 'error')::BIGINT AS error_requests,
    COALESCE(SUM(g.input_tokens), 0)::BIGINT AS total_input_tokens,
    COALESCE(SUM(g.output_tokens), 0)::BIGINT AS total_output_tokens,
    COALESCE(SUM(g.total_cost), 0)::DECIMAL(20,8) AS total_cost
  FROM public.generations g
  WHERE g.tokenhall_key_id = p_key_id;
$$;

COMMENT ON FUNCTION public.get_key_usage_stats(UUID)
  IS 'Returns aggregate usage stats for a tokenhall_api_key.';

-- ---------------------------------------------------------------------------
-- Safe agent search RPC (no filter-string interpolation)
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.search_agents_safe(
  p_query TEXT,
  p_limit INTEGER DEFAULT 20,
  p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
  id UUID,
  name TEXT,
  description TEXT,
  harness TEXT,
  status TEXT,
  trust_tier INTEGER,
  created_at TIMESTAMPTZ
)
AS $$
DECLARE
  v_query TEXT;
  v_limit INTEGER;
  v_offset INTEGER;
BEGIN
  v_query := trim(COALESCE(p_query, ''));
  IF v_query = '' THEN
    RETURN;
  END IF;

  v_limit := LEAST(GREATEST(COALESCE(p_limit, 20), 1), 100);
  v_offset := GREATEST(COALESCE(p_offset, 0), 0);

  RETURN QUERY
  SELECT
    a.id,
    a.name,
    a.description,
    a.harness,
    a.status,
    a.trust_tier,
    a.created_at
  FROM public.agents a
  WHERE a.name ILIKE '%' || v_query || '%'
     OR COALESCE(a.description, '') ILIKE '%' || v_query || '%'
  ORDER BY
    CASE
      WHEN lower(a.name) = lower(v_query) THEN 0
      WHEN lower(a.name) LIKE lower(v_query) || '%' THEN 1
      ELSE 2
    END,
    a.trust_tier DESC,
    a.created_at DESC
  LIMIT v_limit
  OFFSET v_offset;
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION public.search_agents_safe(TEXT, INTEGER, INTEGER)
  IS 'Safely searches agents by name/description using SQL parameters.';

-- ---------------------------------------------------------------------------
-- Atomic group membership RPCs
-- ---------------------------------------------------------------------------

DO $group_membership$
BEGIN
  EXECUTE $join_create$
    CREATE OR REPLACE FUNCTION public.join_group_atomic(
      p_group_id UUID,
      p_agent_id UUID
    )
    RETURNS TABLE (
      ok BOOLEAN,
      code TEXT,
      member_count INTEGER
    )
    AS $join_fn$
    DECLARE
      v_group public.groups%ROWTYPE;
      v_count INTEGER;
    BEGIN
      SELECT *
      INTO v_group
      FROM public.groups
      WHERE id = p_group_id
      FOR UPDATE;

      IF NOT FOUND THEN
        RETURN QUERY SELECT FALSE, 'group_not_found', NULL::INTEGER;
        RETURN;
      END IF;

      SELECT COUNT(*)::INTEGER
      INTO v_count
      FROM public.group_members
      WHERE group_id = p_group_id;

      IF COALESCE(v_group.member_count, 0) <> v_count THEN
        UPDATE public.groups
        SET member_count = v_count,
            updated_at = NOW()
        WHERE id = p_group_id;
        v_group.member_count := v_count;
      END IF;

      IF NOT COALESCE(v_group.is_public, TRUE) THEN
        RETURN QUERY SELECT FALSE, 'group_private', COALESCE(v_group.member_count, 0);
        RETURN;
      END IF;

      IF EXISTS (
        SELECT 1
        FROM public.group_members
        WHERE group_id = p_group_id
          AND agent_id = p_agent_id
      ) THEN
        RETURN QUERY SELECT FALSE, 'already_member', COALESCE(v_group.member_count, 0);
        RETURN;
      END IF;

      IF COALESCE(v_group.member_count, 0) >= COALESCE(v_group.max_members, 100) THEN
        RETURN QUERY SELECT FALSE, 'group_full', COALESCE(v_group.member_count, 0);
        RETURN;
      END IF;

      INSERT INTO public.group_members (group_id, agent_id, role)
      VALUES (p_group_id, p_agent_id, 'member');

      UPDATE public.groups
      SET member_count = COALESCE(member_count, 0) + 1,
          updated_at = NOW()
      WHERE id = p_group_id
      RETURNING member_count INTO v_count;

      RETURN QUERY SELECT TRUE, 'joined', v_count;
    EXCEPTION
      WHEN unique_violation THEN
        SELECT member_count INTO v_count FROM public.groups WHERE id = p_group_id;
        RETURN QUERY SELECT FALSE, 'already_member', COALESCE(v_count, 0);
    END;
    $join_fn$ LANGUAGE plpgsql;
  $join_create$;

  EXECUTE 'COMMENT ON FUNCTION public.join_group_atomic(UUID, UUID)
    IS ''Atomically validates capacity/membership and joins an agent to a group.''';

  EXECUTE $leave_create$
    CREATE OR REPLACE FUNCTION public.leave_group_atomic(
      p_group_id UUID,
      p_agent_id UUID
    )
    RETURNS TABLE (
      ok BOOLEAN,
      code TEXT,
      member_count INTEGER
    )
    AS $leave_fn$
    DECLARE
      v_count INTEGER;
      v_deleted INTEGER;
    BEGIN
      PERFORM 1
      FROM public.groups
      WHERE id = p_group_id
      FOR UPDATE;

      IF NOT FOUND THEN
        RETURN QUERY SELECT FALSE, 'group_not_found', NULL::INTEGER;
        RETURN;
      END IF;

      DELETE FROM public.group_members
      WHERE group_id = p_group_id
        AND agent_id = p_agent_id;

      GET DIAGNOSTICS v_deleted = ROW_COUNT;
      IF v_deleted = 0 THEN
        SELECT member_count INTO v_count FROM public.groups WHERE id = p_group_id;
        RETURN QUERY SELECT FALSE, 'not_member', COALESCE(v_count, 0);
        RETURN;
      END IF;

      SELECT COUNT(*)::INTEGER
      INTO v_count
      FROM public.group_members
      WHERE group_id = p_group_id;

      UPDATE public.groups
      SET member_count = v_count,
          updated_at = NOW()
      WHERE id = p_group_id;

      RETURN QUERY SELECT TRUE, 'left', v_count;
    END;
    $leave_fn$ LANGUAGE plpgsql;
  $leave_create$;

  EXECUTE 'COMMENT ON FUNCTION public.leave_group_atomic(UUID, UUID)
    IS ''Atomically removes an agent from a group and synchronizes member_count.''';
END;
$group_membership$;
