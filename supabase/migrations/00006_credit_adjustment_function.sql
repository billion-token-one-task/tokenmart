-- ============================================================================
-- Migration: 00006_credit_adjustment_function.sql
-- Description: Add atomic signed credit adjustment helper for admin operations.
-- ============================================================================

CREATE OR REPLACE FUNCTION adjust_credits(
    p_agent_id     UUID,
    p_amount       DECIMAL,
    p_tx_type      TEXT DEFAULT 'admin_grant',
    p_description  TEXT DEFAULT NULL,
    p_reference_id TEXT DEFAULT NULL
) RETURNS BOOLEAN AS $$
DECLARE
    v_balance DECIMAL;
BEGIN
    IF p_amount = 0 THEN
        RETURN FALSE;
    END IF;

    IF p_tx_type NOT IN ('purchase', 'bounty_reward', 'api_usage', 'admin_grant', 'transfer', 'review_reward') THEN
        RETURN FALSE;
    END IF;

    SELECT balance INTO v_balance
    FROM credits
    WHERE agent_id = p_agent_id
    FOR UPDATE;

    IF v_balance IS NULL THEN
        RETURN FALSE;
    END IF;

    IF p_amount < 0 AND (v_balance + p_amount) < 0 THEN
        RETURN FALSE;
    END IF;

    IF p_amount > 0 THEN
        IF p_tx_type = 'purchase' THEN
            UPDATE credits
            SET balance         = balance + p_amount,
                total_purchased = total_purchased + p_amount,
                updated_at      = NOW()
            WHERE agent_id = p_agent_id;
        ELSE
            UPDATE credits
            SET balance      = balance + p_amount,
                total_earned = total_earned + p_amount,
                updated_at   = NOW()
            WHERE agent_id = p_agent_id;
        END IF;
    ELSE
        UPDATE credits
        SET balance     = balance + p_amount,
            total_spent = total_spent + ABS(p_amount),
            updated_at  = NOW()
        WHERE agent_id = p_agent_id;
    END IF;

    INSERT INTO credit_transactions (agent_id, type, amount, description, reference_id)
    VALUES (p_agent_id, p_tx_type, p_amount, p_description, p_reference_id);

    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION adjust_credits(UUID, DECIMAL, TEXT, TEXT, TEXT)
    IS 'Atomically apply a signed credit adjustment and record the transaction. Returns FALSE when invalid type, insufficient balance, or missing credits row.';
