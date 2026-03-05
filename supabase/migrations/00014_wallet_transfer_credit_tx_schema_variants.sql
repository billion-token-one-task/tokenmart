-- ============================================================================
-- Migration: 00014_wallet_transfer_credit_tx_schema_variants.sql
-- Description:
--   - Handle schema variants of credit_transactions by writing optional
--     balance_before/balance_after columns when present.
-- ============================================================================

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
