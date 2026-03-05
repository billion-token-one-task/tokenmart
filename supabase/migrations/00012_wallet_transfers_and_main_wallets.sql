-- ============================================================================
-- Migration: 00012_wallet_transfers_and_main_wallets.sql
-- Description:
--   - Introduce account-level main credit wallets (distinct wallet address)
--   - Add wallet addresses + transfer counters to agent credits wallets
--   - Add immutable wallet transfer ledger
--   - Add atomic transfer RPC across account/agent wallets
--   - Add wallet bootstrap RPC helpers
-- ============================================================================

-- ---------------------------------------------------------------------------
-- Account main wallets
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.account_credit_wallets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL UNIQUE REFERENCES public.accounts(id) ON DELETE CASCADE,
  wallet_address TEXT NOT NULL UNIQUE,
  balance DECIMAL(20,8) NOT NULL DEFAULT 0,
  total_transferred_in DECIMAL(20,8) NOT NULL DEFAULT 0,
  total_transferred_out DECIMAL(20,8) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_account_credit_wallets_nonnegative_balance CHECK (balance >= 0),
  CONSTRAINT chk_account_credit_wallets_nonnegative_in CHECK (total_transferred_in >= 0),
  CONSTRAINT chk_account_credit_wallets_nonnegative_out CHECK (total_transferred_out >= 0)
);

COMMENT ON TABLE public.account_credit_wallets IS
  'Primary TokenMart credit wallet for each user account (distinct address per account).';
COMMENT ON COLUMN public.account_credit_wallets.wallet_address IS
  'Unique public wallet address for account-level credit transfers.';

-- Keep updated_at semantics consistent with other mutable tables.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_proc
    WHERE proname = 'set_updated_at'
      AND pg_function_is_visible(oid)
  ) THEN
    DROP TRIGGER IF EXISTS trg_set_updated_at_account_credit_wallets ON public.account_credit_wallets;
    CREATE TRIGGER trg_set_updated_at_account_credit_wallets
      BEFORE UPDATE ON public.account_credit_wallets
      FOR EACH ROW
      EXECUTE FUNCTION public.set_updated_at();
  END IF;
END;
$$;

-- ---------------------------------------------------------------------------
-- Agent sub-wallet addresses and transfer counters
-- ---------------------------------------------------------------------------

ALTER TABLE public.credits
  ADD COLUMN IF NOT EXISTS wallet_address TEXT;

ALTER TABLE public.credits
  ADD COLUMN IF NOT EXISTS total_transferred_in DECIMAL(20,8) DEFAULT 0;

ALTER TABLE public.credits
  ADD COLUMN IF NOT EXISTS total_transferred_out DECIMAL(20,8) DEFAULT 0;

ALTER TABLE public.credits
  ALTER COLUMN total_transferred_in SET DEFAULT 0;

ALTER TABLE public.credits
  ALTER COLUMN total_transferred_out SET DEFAULT 0;

UPDATE public.credits
SET total_transferred_in = 0
WHERE total_transferred_in IS NULL;

UPDATE public.credits
SET total_transferred_out = 0
WHERE total_transferred_out IS NULL;

ALTER TABLE public.credits
  ALTER COLUMN total_transferred_in SET NOT NULL;

ALTER TABLE public.credits
  ALTER COLUMN total_transferred_out SET NOT NULL;

-- Keep credits.account_id aligned with authoritative ownership when claimed.
UPDATE public.credits c
SET account_id = a.owner_account_id
FROM public.agents a
WHERE c.agent_id = a.id
  AND c.account_id IS DISTINCT FROM a.owner_account_id;

-- ---------------------------------------------------------------------------
-- Shared wallet address generation helper
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.generate_credit_wallet_address(
  p_prefix TEXT
)
RETURNS TEXT
LANGUAGE plpgsql
VOLATILE
AS $$
DECLARE
  v_prefix TEXT;
  v_candidate TEXT;
BEGIN
  v_prefix := lower(trim(COALESCE(p_prefix, 'tmw')));
  IF v_prefix = '' THEN
    v_prefix := 'tmw';
  END IF;

  LOOP
    -- Use UUID entropy instead of gen_random_bytes for wider Postgres compatibility.
    v_candidate := v_prefix || '_' || replace(gen_random_uuid()::text, '-', '');

    EXIT WHEN NOT EXISTS (
      SELECT 1 FROM public.credits c WHERE c.wallet_address = v_candidate
    )
    AND NOT EXISTS (
      SELECT 1 FROM public.account_credit_wallets w WHERE w.wallet_address = v_candidate
    );
  END LOOP;

  RETURN v_candidate;
END;
$$;

COMMENT ON FUNCTION public.generate_credit_wallet_address(TEXT)
  IS 'Generates a unique wallet address across agent and account wallet tables.';

-- ---------------------------------------------------------------------------
-- Wallet address backfill and constraints
-- ---------------------------------------------------------------------------

-- If duplicate non-null addresses somehow exist, keep the oldest and regenerate the rest.
WITH ranked AS (
  SELECT
    id,
    wallet_address,
    ROW_NUMBER() OVER (
      PARTITION BY wallet_address
      ORDER BY created_at ASC, id ASC
    ) AS rn
  FROM public.credits
  WHERE wallet_address IS NOT NULL
)
UPDATE public.credits c
SET wallet_address = NULL
FROM ranked r
WHERE c.id = r.id
  AND r.rn > 1;

UPDATE public.credits
SET wallet_address = public.generate_credit_wallet_address('tma')
WHERE wallet_address IS NULL
   OR btrim(wallet_address) = '';

ALTER TABLE public.credits
  ALTER COLUMN wallet_address SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_credits_wallet_address
  ON public.credits (wallet_address);

-- Backfill account main wallets for all existing accounts.
INSERT INTO public.account_credit_wallets (
  account_id,
  wallet_address,
  balance,
  total_transferred_in,
  total_transferred_out
)
SELECT
  a.id,
  public.generate_credit_wallet_address('tmu'),
  0,
  0,
  0
FROM public.accounts a
LEFT JOIN public.account_credit_wallets w
  ON w.account_id = a.id
WHERE w.id IS NULL;

-- ---------------------------------------------------------------------------
-- Immutable transfer ledger
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.wallet_transfers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  from_wallet_address TEXT NOT NULL,
  to_wallet_address TEXT NOT NULL,

  from_owner_type TEXT NOT NULL CHECK (from_owner_type IN ('account', 'agent')),
  to_owner_type TEXT NOT NULL CHECK (to_owner_type IN ('account', 'agent')),

  from_account_id UUID REFERENCES public.accounts(id) ON DELETE SET NULL,
  to_account_id UUID REFERENCES public.accounts(id) ON DELETE SET NULL,
  from_agent_id UUID REFERENCES public.agents(id) ON DELETE SET NULL,
  to_agent_id UUID REFERENCES public.agents(id) ON DELETE SET NULL,

  amount DECIMAL(20,8) NOT NULL CHECK (amount > 0),
  memo TEXT,

  initiated_by_type TEXT NOT NULL CHECK (initiated_by_type IN ('account', 'agent', 'system')),
  initiated_by_account_id UUID REFERENCES public.accounts(id) ON DELETE SET NULL,
  initiated_by_agent_id UUID REFERENCES public.agents(id) ON DELETE SET NULL,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT chk_wallet_transfers_distinct_wallets CHECK (from_wallet_address <> to_wallet_address),

  CONSTRAINT chk_wallet_transfers_from_owner_shape CHECK (
    (
      from_owner_type = 'account'
      AND from_account_id IS NOT NULL
      AND from_agent_id IS NULL
    )
    OR
    (
      from_owner_type = 'agent'
      AND from_agent_id IS NOT NULL
    )
  ),

  CONSTRAINT chk_wallet_transfers_to_owner_shape CHECK (
    (
      to_owner_type = 'account'
      AND to_account_id IS NOT NULL
      AND to_agent_id IS NULL
    )
    OR
    (
      to_owner_type = 'agent'
      AND to_agent_id IS NOT NULL
    )
  ),

  CONSTRAINT chk_wallet_transfers_initiator_shape CHECK (
    (
      initiated_by_type = 'account'
      AND initiated_by_account_id IS NOT NULL
      AND initiated_by_agent_id IS NULL
    )
    OR
    (
      initiated_by_type = 'agent'
      AND initiated_by_agent_id IS NOT NULL
    )
    OR
    (
      initiated_by_type = 'system'
      AND initiated_by_account_id IS NULL
      AND initiated_by_agent_id IS NULL
    )
  )
);

COMMENT ON TABLE public.wallet_transfers IS
  'Immutable transfer ledger across account main wallets and agent sub-wallets.';
COMMENT ON COLUMN public.wallet_transfers.from_wallet_address IS
  'Sender wallet address (main wallet or sub-wallet).';
COMMENT ON COLUMN public.wallet_transfers.to_wallet_address IS
  'Destination wallet address (main wallet or sub-wallet).';

CREATE INDEX IF NOT EXISTS idx_wallet_transfers_created_at
  ON public.wallet_transfers (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_wallet_transfers_from_wallet
  ON public.wallet_transfers (from_wallet_address, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_wallet_transfers_to_wallet
  ON public.wallet_transfers (to_wallet_address, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_wallet_transfers_from_agent
  ON public.wallet_transfers (from_agent_id, created_at DESC)
  WHERE from_agent_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_wallet_transfers_to_agent
  ON public.wallet_transfers (to_agent_id, created_at DESC)
  WHERE to_agent_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_wallet_transfers_from_account
  ON public.wallet_transfers (from_account_id, created_at DESC)
  WHERE from_account_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_wallet_transfers_to_account
  ON public.wallet_transfers (to_account_id, created_at DESC)
  WHERE to_account_id IS NOT NULL;

-- ---------------------------------------------------------------------------
-- Wallet ensure RPCs
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.ensure_account_credit_wallet(
  p_account_id UUID
)
RETURNS public.account_credit_wallets
LANGUAGE plpgsql
AS $$
DECLARE
  v_wallet public.account_credit_wallets%ROWTYPE;
  v_address TEXT;
BEGIN
  IF p_account_id IS NULL THEN
    RAISE EXCEPTION USING MESSAGE = 'account_id_required';
  END IF;

  SELECT *
  INTO v_wallet
  FROM public.account_credit_wallets
  WHERE account_id = p_account_id
  FOR UPDATE;

  IF FOUND THEN
    RETURN v_wallet;
  END IF;

  LOOP
    v_address := public.generate_credit_wallet_address('tmu');

    BEGIN
      INSERT INTO public.account_credit_wallets (
        account_id,
        wallet_address,
        balance,
        total_transferred_in,
        total_transferred_out
      )
      VALUES (
        p_account_id,
        v_address,
        0,
        0,
        0
      )
      RETURNING * INTO v_wallet;

      RETURN v_wallet;
    EXCEPTION
      WHEN unique_violation THEN
        -- Handle either account race (another writer created it) or rare
        -- address collision under concurrency.
        SELECT *
        INTO v_wallet
        FROM public.account_credit_wallets
        WHERE account_id = p_account_id;

        IF FOUND THEN
          RETURN v_wallet;
        END IF;
    END;
  END LOOP;
END;
$$;

COMMENT ON FUNCTION public.ensure_account_credit_wallet(UUID)
  IS 'Creates or returns the account main wallet for a given account ID.';

CREATE OR REPLACE FUNCTION public.ensure_agent_credit_wallet(
  p_agent_id UUID,
  p_account_id UUID DEFAULT NULL
)
RETURNS public.credits
LANGUAGE plpgsql
AS $$
DECLARE
  v_credit public.credits%ROWTYPE;
  v_address TEXT;
BEGIN
  IF p_agent_id IS NULL THEN
    RAISE EXCEPTION USING MESSAGE = 'agent_id_required';
  END IF;

  SELECT *
  INTO v_credit
  FROM public.credits
  WHERE agent_id = p_agent_id
  FOR UPDATE;

  IF FOUND THEN
    IF v_credit.wallet_address IS NULL OR btrim(v_credit.wallet_address) = '' THEN
      UPDATE public.credits
      SET wallet_address = public.generate_credit_wallet_address('tma'),
          updated_at = NOW()
      WHERE id = v_credit.id
      RETURNING * INTO v_credit;
    END IF;

    IF p_account_id IS NOT NULL AND v_credit.account_id IS DISTINCT FROM p_account_id THEN
      UPDATE public.credits
      SET account_id = p_account_id,
          updated_at = NOW()
      WHERE id = v_credit.id
      RETURNING * INTO v_credit;
    END IF;

    RETURN v_credit;
  END IF;

  LOOP
    v_address := public.generate_credit_wallet_address('tma');

    BEGIN
      INSERT INTO public.credits (
        agent_id,
        account_id,
        wallet_address,
        balance,
        total_purchased,
        total_earned,
        total_spent,
        total_transferred_in,
        total_transferred_out
      )
      VALUES (
        p_agent_id,
        p_account_id,
        v_address,
        0,
        0,
        0,
        0,
        0,
        0
      )
      RETURNING * INTO v_credit;

      RETURN v_credit;
    EXCEPTION
      WHEN unique_violation THEN
        SELECT *
        INTO v_credit
        FROM public.credits
        WHERE agent_id = p_agent_id
        FOR UPDATE;

        IF FOUND THEN
          IF v_credit.wallet_address IS NULL OR btrim(v_credit.wallet_address) = '' THEN
            UPDATE public.credits
            SET wallet_address = public.generate_credit_wallet_address('tma'),
                updated_at = NOW()
            WHERE id = v_credit.id
            RETURNING * INTO v_credit;
          END IF;

          IF p_account_id IS NOT NULL AND v_credit.account_id IS DISTINCT FROM p_account_id THEN
            UPDATE public.credits
            SET account_id = p_account_id,
                updated_at = NOW()
            WHERE id = v_credit.id
            RETURNING * INTO v_credit;
          END IF;

          RETURN v_credit;
        END IF;
    END;
  END LOOP;
END;
$$;

COMMENT ON FUNCTION public.ensure_agent_credit_wallet(UUID, UUID)
  IS 'Creates or returns an agent sub-wallet row in credits and keeps ownership in sync.';

-- ---------------------------------------------------------------------------
-- Atomic wallet transfer RPC
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.transfer_wallet_credits(
  p_from_wallet_address TEXT,
  p_to_wallet_address TEXT,
  p_amount DECIMAL,
  p_memo TEXT DEFAULT NULL,
  p_initiated_by_account_id UUID DEFAULT NULL,
  p_initiated_by_agent_id UUID DEFAULT NULL
)
RETURNS TABLE (
  transfer_id UUID,
  from_wallet_address TEXT,
  to_wallet_address TEXT,
  amount DECIMAL,
  memo TEXT,
  from_owner_type TEXT,
  to_owner_type TEXT,
  from_account_id UUID,
  to_account_id UUID,
  from_agent_id UUID,
  to_agent_id UUID,
  from_balance_after DECIMAL,
  to_balance_after DECIMAL,
  created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
AS $$
DECLARE
  v_from_address TEXT;
  v_to_address TEXT;
  v_amount DECIMAL;

  v_transfer_id UUID := gen_random_uuid();
  v_created_at TIMESTAMPTZ := NOW();

  v_from_agent public.credits%ROWTYPE;
  v_to_agent public.credits%ROWTYPE;
  v_from_account public.account_credit_wallets%ROWTYPE;
  v_to_account public.account_credit_wallets%ROWTYPE;

  v_from_owner_type TEXT;
  v_to_owner_type TEXT;

  v_from_account_id UUID;
  v_to_account_id UUID;
  v_from_agent_id UUID;
  v_to_agent_id UUID;

  v_from_balance_after DECIMAL;
  v_to_balance_after DECIMAL;

  v_initiated_by_type TEXT := 'system';
  v_tx_description TEXT;
  v_credit_tx_has_balance_before BOOLEAN := FALSE;
  v_credit_tx_has_balance_after BOOLEAN := FALSE;
BEGIN
  v_from_address := lower(trim(COALESCE(p_from_wallet_address, '')));
  v_to_address := lower(trim(COALESCE(p_to_wallet_address, '')));
  v_amount := p_amount;

  IF v_from_address = '' THEN
    RAISE EXCEPTION USING MESSAGE = 'from_wallet_address_required';
  END IF;

  IF v_to_address = '' THEN
    RAISE EXCEPTION USING MESSAGE = 'to_wallet_address_required';
  END IF;

  IF v_from_address = v_to_address THEN
    RAISE EXCEPTION USING MESSAGE = 'self_transfer_not_allowed';
  END IF;

  IF v_amount IS NULL OR v_amount <= 0 THEN
    RAISE EXCEPTION USING MESSAGE = 'invalid_amount';
  END IF;

  IF scale(v_amount) > 8 THEN
    RAISE EXCEPTION USING MESSAGE = 'amount_precision_exceeded';
  END IF;

  SELECT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'credit_transactions'
      AND column_name = 'balance_before'
  )
  INTO v_credit_tx_has_balance_before;

  SELECT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'credit_transactions'
      AND column_name = 'balance_after'
  )
  INTO v_credit_tx_has_balance_after;

  -- Avoid deadlocks by serializing transfers for the wallet pair.
  PERFORM pg_advisory_xact_lock(hashtext(LEAST(v_from_address, v_to_address) || '|' || GREATEST(v_from_address, v_to_address)));

  -- Resolve + lock sender
  SELECT *
  INTO v_from_agent
  FROM public.credits
  WHERE wallet_address = v_from_address
  FOR UPDATE;

  IF FOUND THEN
    v_from_owner_type := 'agent';
    v_from_agent_id := v_from_agent.agent_id;
    v_from_account_id := v_from_agent.account_id;
  ELSE
    SELECT *
    INTO v_from_account
    FROM public.account_credit_wallets
    WHERE wallet_address = v_from_address
    FOR UPDATE;

    IF NOT FOUND THEN
      RAISE EXCEPTION USING MESSAGE = 'from_wallet_not_found';
    END IF;

    v_from_owner_type := 'account';
    v_from_account_id := v_from_account.account_id;
    v_from_agent_id := NULL;
  END IF;

  -- Resolve + lock destination
  SELECT *
  INTO v_to_agent
  FROM public.credits
  WHERE wallet_address = v_to_address
  FOR UPDATE;

  IF FOUND THEN
    v_to_owner_type := 'agent';
    v_to_agent_id := v_to_agent.agent_id;
    v_to_account_id := v_to_agent.account_id;
  ELSE
    SELECT *
    INTO v_to_account
    FROM public.account_credit_wallets
    WHERE wallet_address = v_to_address
    FOR UPDATE;

    IF NOT FOUND THEN
      RAISE EXCEPTION USING MESSAGE = 'to_wallet_not_found';
    END IF;

    v_to_owner_type := 'account';
    v_to_account_id := v_to_account.account_id;
    v_to_agent_id := NULL;
  END IF;

  -- Authorization caller metadata for audit
  IF p_initiated_by_agent_id IS NOT NULL THEN
    v_initiated_by_type := 'agent';
  ELSIF p_initiated_by_account_id IS NOT NULL THEN
    v_initiated_by_type := 'account';
  END IF;

  -- Balance check + sender debit
  IF v_from_owner_type = 'agent' THEN
    IF v_from_agent.balance < v_amount THEN
      RAISE EXCEPTION USING MESSAGE = 'insufficient_balance';
    END IF;

    UPDATE public.credits
    SET balance = balance - v_amount,
        total_transferred_out = COALESCE(total_transferred_out, 0) + v_amount,
        updated_at = NOW()
    WHERE id = v_from_agent.id
    RETURNING balance INTO v_from_balance_after;
  ELSE
    IF v_from_account.balance < v_amount THEN
      RAISE EXCEPTION USING MESSAGE = 'insufficient_balance';
    END IF;

    UPDATE public.account_credit_wallets
    SET balance = balance - v_amount,
        total_transferred_out = COALESCE(total_transferred_out, 0) + v_amount,
        updated_at = NOW()
    WHERE id = v_from_account.id
    RETURNING balance INTO v_from_balance_after;
  END IF;

  -- Receiver credit
  IF v_to_owner_type = 'agent' THEN
    UPDATE public.credits
    SET balance = balance + v_amount,
        total_transferred_in = COALESCE(total_transferred_in, 0) + v_amount,
        updated_at = NOW()
    WHERE id = v_to_agent.id
    RETURNING balance INTO v_to_balance_after;
  ELSE
    UPDATE public.account_credit_wallets
    SET balance = balance + v_amount,
        total_transferred_in = COALESCE(total_transferred_in, 0) + v_amount,
        updated_at = NOW()
    WHERE id = v_to_account.id
    RETURNING balance INTO v_to_balance_after;
  END IF;

  INSERT INTO public.wallet_transfers (
    id,
    from_wallet_address,
    to_wallet_address,
    from_owner_type,
    to_owner_type,
    from_account_id,
    to_account_id,
    from_agent_id,
    to_agent_id,
    amount,
    memo,
    initiated_by_type,
    initiated_by_account_id,
    initiated_by_agent_id,
    created_at
  )
  VALUES (
    v_transfer_id,
    v_from_address,
    v_to_address,
    v_from_owner_type,
    v_to_owner_type,
    v_from_account_id,
    v_to_account_id,
    v_from_agent_id,
    v_to_agent_id,
    v_amount,
    NULLIF(trim(COALESCE(p_memo, '')), ''),
    v_initiated_by_type,
    p_initiated_by_account_id,
    p_initiated_by_agent_id,
    v_created_at
  );

  -- Keep agent-facing credit_transactions in sync for both sides where relevant.
  IF v_from_owner_type = 'agent' THEN
    v_tx_description := COALESCE(NULLIF(trim(COALESCE(p_memo, '')), ''), 'Transfer to ' || v_to_address);
    IF v_credit_tx_has_balance_before AND v_credit_tx_has_balance_after THEN
      EXECUTE
        'INSERT INTO public.credit_transactions (agent_id, type, amount, description, reference_id, balance_before, balance_after)
         VALUES ($1, $2, $3, $4, $5, $6, $7)'
      USING
        v_from_agent_id,
        'transfer',
        -v_amount,
        v_tx_description,
        v_transfer_id,
        v_from_balance_after + v_amount,
        v_from_balance_after;
    ELSIF v_credit_tx_has_balance_before THEN
      EXECUTE
        'INSERT INTO public.credit_transactions (agent_id, type, amount, description, reference_id, balance_before)
         VALUES ($1, $2, $3, $4, $5, $6)'
      USING
        v_from_agent_id,
        'transfer',
        -v_amount,
        v_tx_description,
        v_transfer_id,
        v_from_balance_after + v_amount;
    ELSIF v_credit_tx_has_balance_after THEN
      EXECUTE
        'INSERT INTO public.credit_transactions (agent_id, type, amount, description, reference_id, balance_after)
         VALUES ($1, $2, $3, $4, $5, $6)'
      USING
        v_from_agent_id,
        'transfer',
        -v_amount,
        v_tx_description,
        v_transfer_id,
        v_from_balance_after;
    ELSE
      INSERT INTO public.credit_transactions (agent_id, type, amount, description, reference_id)
      VALUES (
        v_from_agent_id,
        'transfer',
        -v_amount,
        v_tx_description,
        v_transfer_id
      );
    END IF;
  END IF;

  IF v_to_owner_type = 'agent' THEN
    v_tx_description := COALESCE(NULLIF(trim(COALESCE(p_memo, '')), ''), 'Transfer from ' || v_from_address);
    IF v_credit_tx_has_balance_before AND v_credit_tx_has_balance_after THEN
      EXECUTE
        'INSERT INTO public.credit_transactions (agent_id, type, amount, description, reference_id, balance_before, balance_after)
         VALUES ($1, $2, $3, $4, $5, $6, $7)'
      USING
        v_to_agent_id,
        'transfer',
        v_amount,
        v_tx_description,
        v_transfer_id,
        v_to_balance_after - v_amount,
        v_to_balance_after;
    ELSIF v_credit_tx_has_balance_before THEN
      EXECUTE
        'INSERT INTO public.credit_transactions (agent_id, type, amount, description, reference_id, balance_before)
         VALUES ($1, $2, $3, $4, $5, $6)'
      USING
        v_to_agent_id,
        'transfer',
        v_amount,
        v_tx_description,
        v_transfer_id,
        v_to_balance_after - v_amount;
    ELSIF v_credit_tx_has_balance_after THEN
      EXECUTE
        'INSERT INTO public.credit_transactions (agent_id, type, amount, description, reference_id, balance_after)
         VALUES ($1, $2, $3, $4, $5, $6)'
      USING
        v_to_agent_id,
        'transfer',
        v_amount,
        v_tx_description,
        v_transfer_id,
        v_to_balance_after;
    ELSE
      INSERT INTO public.credit_transactions (agent_id, type, amount, description, reference_id)
      VALUES (
        v_to_agent_id,
        'transfer',
        v_amount,
        v_tx_description,
        v_transfer_id
      );
    END IF;
  END IF;

  RETURN QUERY
  SELECT
    v_transfer_id,
    v_from_address,
    v_to_address,
    v_amount,
    NULLIF(trim(COALESCE(p_memo, '')), ''),
    v_from_owner_type,
    v_to_owner_type,
    v_from_account_id,
    v_to_account_id,
    v_from_agent_id,
    v_to_agent_id,
    v_from_balance_after,
    v_to_balance_after,
    v_created_at;
END;
$$;

COMMENT ON FUNCTION public.transfer_wallet_credits(TEXT, TEXT, DECIMAL, TEXT, UUID, UUID)
  IS 'Atomically transfers credits between wallet addresses with row locks and immutable transfer audit rows.';

-- ---------------------------------------------------------------------------
-- RLS hardening for newly introduced tables
-- ---------------------------------------------------------------------------

ALTER TABLE public.account_credit_wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wallet_transfers ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'account_credit_wallets'
      AND policyname = 'service_role_full_access_account_credit_wallets'
  ) THEN
    CREATE POLICY service_role_full_access_account_credit_wallets
      ON public.account_credit_wallets FOR ALL
      USING (auth.role() = 'service_role')
      WITH CHECK (auth.role() = 'service_role');
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'wallet_transfers'
      AND policyname = 'service_role_full_access_wallet_transfers'
  ) THEN
    CREATE POLICY service_role_full_access_wallet_transfers
      ON public.wallet_transfers FOR ALL
      USING (auth.role() = 'service_role')
      WITH CHECK (auth.role() = 'service_role');
  END IF;
END;
$$;
