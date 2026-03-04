-- ============================================================================
-- Migration: 00002_tokenhall_tables.sql
-- Description: TokenHall tables — OpenRouter-compatible LLM proxy layer
--
-- Tables:
--   1. credits              - Agent credit balance ledger
--   2. tokenhall_api_keys   - th_ and thm_ API keys (separate from auth keys)
--   3. credit_transactions  - Immutable audit log for credit movements
--   4. provider_keys        - BYOK encrypted provider API keys
--   5. models               - Model registry with pricing
--   6. generations          - Per-call usage tracking (no prompts stored)
--
-- Functions:
--   - deduct_credits()      - Atomic credit deduction with row locking
--   - grant_credits()       - Credit granting for admin / bounty rewards
--
-- Triggers:
--   - set_updated_at on credits, models
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. credits — Agent credit balance ledger
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS credits (
    id               UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_id         UUID          NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
    account_id       UUID          REFERENCES accounts(id) ON DELETE SET NULL,
    balance          DECIMAL(20,8) DEFAULT 0,
    total_purchased  DECIMAL(20,8) DEFAULT 0,
    total_earned     DECIMAL(20,8) DEFAULT 0,
    total_spent      DECIMAL(20,8) DEFAULT 0,
    created_at       TIMESTAMPTZ   DEFAULT NOW(),
    updated_at       TIMESTAMPTZ   DEFAULT NOW(),

    CONSTRAINT uq_credits_agent_id UNIQUE (agent_id)
);

COMMENT ON TABLE  credits IS 'One credit-balance account per agent; tracks running totals.';
COMMENT ON COLUMN credits.balance IS 'Current spendable balance (purchased + earned - spent).';
COMMENT ON COLUMN credits.total_purchased IS 'Lifetime credits purchased with real currency.';
COMMENT ON COLUMN credits.total_earned IS 'Lifetime credits earned via bounties, reviews, etc.';
COMMENT ON COLUMN credits.total_spent IS 'Lifetime credits spent on API usage.';

-- Reconcile legacy credits table variants (older deployments may be missing
-- account_id/created_at/id even when the table already exists).
ALTER TABLE public.credits
    ADD COLUMN IF NOT EXISTS account_id UUID REFERENCES accounts(id) ON DELETE SET NULL;

ALTER TABLE public.credits
    ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();

ALTER TABLE public.credits
    ADD COLUMN IF NOT EXISTS id UUID DEFAULT gen_random_uuid();

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conrelid = 'public.credits'::regclass
          AND contype = 'p'
    ) THEN
        UPDATE public.credits
        SET id = gen_random_uuid()
        WHERE id IS NULL;

        ALTER TABLE public.credits
            ALTER COLUMN id SET NOT NULL;

        ALTER TABLE public.credits
            ADD CONSTRAINT credits_pkey PRIMARY KEY (id);
    END IF;
END;
$$;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_credits_agent_id
    ON credits (agent_id);

CREATE INDEX IF NOT EXISTS idx_credits_account_id
    ON credits (account_id);

-- ---------------------------------------------------------------------------
-- 2. tokenhall_api_keys — th_ and thm_ keys (separate from auth keys)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS tokenhall_api_keys (
    id                UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
    key_hash          TEXT          UNIQUE NOT NULL,
    key_prefix        TEXT          NOT NULL,
    label             TEXT,
    agent_id          UUID          REFERENCES agents(id) ON DELETE CASCADE,
    account_id        UUID          REFERENCES accounts(id) ON DELETE CASCADE,
    is_management_key BOOLEAN       DEFAULT FALSE,
    credit_limit      DECIMAL(20,8),
    rate_limit_rpm    INTEGER,
    last_used_at      TIMESTAMPTZ,
    expires_at        TIMESTAMPTZ,
    revoked           BOOLEAN       DEFAULT FALSE,
    created_at        TIMESTAMPTZ   DEFAULT NOW()
);

COMMENT ON TABLE  tokenhall_api_keys IS 'API keys for TokenHall LLM proxy. th_ prefix for inference keys, thm_ for management keys.';
COMMENT ON COLUMN tokenhall_api_keys.key_hash IS 'SHA-256 hash of the full API key.';
COMMENT ON COLUMN tokenhall_api_keys.key_prefix IS 'First characters of the key for identification / display.';
COMMENT ON COLUMN tokenhall_api_keys.is_management_key IS 'TRUE for thm_ management keys; FALSE for th_ inference keys.';
COMMENT ON COLUMN tokenhall_api_keys.credit_limit IS 'Per-key credit spending limit; NULL means unlimited.';
COMMENT ON COLUMN tokenhall_api_keys.rate_limit_rpm IS 'Per-key rate limit in requests per minute; NULL means platform default.';

-- Indexes
CREATE INDEX IF NOT EXISTS idx_tokenhall_api_keys_key_hash
    ON tokenhall_api_keys (key_hash);

CREATE INDEX IF NOT EXISTS idx_tokenhall_api_keys_agent_id
    ON tokenhall_api_keys (agent_id);

CREATE INDEX IF NOT EXISTS idx_tokenhall_api_keys_account_id
    ON tokenhall_api_keys (account_id);

CREATE INDEX IF NOT EXISTS idx_tokenhall_api_keys_revoked
    ON tokenhall_api_keys (revoked);

-- ---------------------------------------------------------------------------
-- 3. credit_transactions — Immutable audit log
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS credit_transactions (
    id            UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_id      UUID          NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
    type          TEXT          NOT NULL
                  CHECK (type IN ('purchase', 'bounty_reward', 'api_usage', 'admin_grant', 'transfer', 'review_reward')),
    amount        DECIMAL(20,8) NOT NULL,
    description   TEXT,
    reference_id  TEXT,
    created_at    TIMESTAMPTZ   DEFAULT NOW()
);

COMMENT ON TABLE  credit_transactions IS 'Immutable audit log for every credit movement (purchases, rewards, usage, grants, transfers).';
COMMENT ON COLUMN credit_transactions.type IS 'Transaction type: purchase | bounty_reward | api_usage | admin_grant | transfer | review_reward.';
COMMENT ON COLUMN credit_transactions.amount IS 'Signed amount: positive for credits in, negative for credits out.';
COMMENT ON COLUMN credit_transactions.reference_id IS 'Polymorphic reference to the generation, bounty, or other entity that triggered this transaction.';

-- Indexes
CREATE INDEX IF NOT EXISTS idx_credit_transactions_agent_id
    ON credit_transactions (agent_id);

CREATE INDEX IF NOT EXISTS idx_credit_transactions_type
    ON credit_transactions (type);

CREATE INDEX IF NOT EXISTS idx_credit_transactions_created_at
    ON credit_transactions (created_at DESC);

-- ---------------------------------------------------------------------------
-- 4. provider_keys — BYOK encrypted provider API keys
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS provider_keys (
    id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_id       UUID        REFERENCES agents(id) ON DELETE CASCADE,
    account_id     UUID        REFERENCES accounts(id) ON DELETE CASCADE,
    provider       TEXT        NOT NULL,
    encrypted_key  TEXT        NOT NULL,
    iv             TEXT        NOT NULL,
    label          TEXT,
    created_at     TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE  provider_keys IS 'BYOK (Bring Your Own Key) encrypted provider API keys for direct pass-through.';
COMMENT ON COLUMN provider_keys.provider IS 'Provider identifier: openrouter, openai, anthropic, etc.';
COMMENT ON COLUMN provider_keys.encrypted_key IS 'AES-256 encrypted API key ciphertext.';
COMMENT ON COLUMN provider_keys.iv IS 'Initialization vector used for AES-256 encryption.';

-- Indexes
CREATE INDEX IF NOT EXISTS idx_provider_keys_agent_id
    ON provider_keys (agent_id);

CREATE INDEX IF NOT EXISTS idx_provider_keys_account_id
    ON provider_keys (account_id);

CREATE INDEX IF NOT EXISTS idx_provider_keys_provider
    ON provider_keys (provider);

-- ---------------------------------------------------------------------------
-- 5. models — Model registry with pricing
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS models (
    id                       UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
    model_id                 TEXT          UNIQUE NOT NULL,
    name                     TEXT          NOT NULL,
    provider                 TEXT          NOT NULL,
    input_price_per_million  DECIMAL(20,8) NOT NULL,
    output_price_per_million DECIMAL(20,8) NOT NULL,
    context_length           INTEGER,
    max_output_tokens        INTEGER,
    supports_streaming       BOOLEAN       DEFAULT TRUE,
    supports_tools           BOOLEAN       DEFAULT FALSE,
    supports_vision          BOOLEAN       DEFAULT FALSE,
    active                   BOOLEAN       DEFAULT TRUE,
    metadata                 JSONB         DEFAULT '{}',
    created_at               TIMESTAMPTZ   DEFAULT NOW(),
    updated_at               TIMESTAMPTZ   DEFAULT NOW()
);

COMMENT ON TABLE  models IS 'Registry of available LLM models with pricing and capability flags.';
COMMENT ON COLUMN models.model_id IS 'Canonical model identifier, e.g. openai/gpt-4o.';
COMMENT ON COLUMN models.provider IS 'Which upstream provider serves this model.';
COMMENT ON COLUMN models.input_price_per_million IS 'Cost per 1 M input tokens in credits.';
COMMENT ON COLUMN models.output_price_per_million IS 'Cost per 1 M output tokens in credits.';
COMMENT ON COLUMN models.metadata IS 'Arbitrary JSON metadata (modalities, fine-tune info, etc.).';

-- Indexes
CREATE INDEX IF NOT EXISTS idx_models_model_id
    ON models (model_id);

CREATE INDEX IF NOT EXISTS idx_models_provider
    ON models (provider);

CREATE INDEX IF NOT EXISTS idx_models_active
    ON models (active);

-- ---------------------------------------------------------------------------
-- 6. generations — Every API call tracked (no prompt/response stored)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS generations (
    id               UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_id         UUID          NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
    tokenhall_key_id UUID          NOT NULL REFERENCES tokenhall_api_keys(id) ON DELETE CASCADE,
    model_id         TEXT          NOT NULL,
    provider         TEXT          NOT NULL,
    input_tokens     INTEGER       NOT NULL DEFAULT 0,
    output_tokens    INTEGER       NOT NULL DEFAULT 0,
    total_cost       DECIMAL(20,8) NOT NULL DEFAULT 0,
    latency_ms       INTEGER,
    status           TEXT          NOT NULL DEFAULT 'success'
                     CHECK (status IN ('success', 'error', 'cancelled')),
    error_message    TEXT,
    created_at       TIMESTAMPTZ   DEFAULT NOW()
);

COMMENT ON TABLE  generations IS 'Usage log for every TokenHall API call. Prompts and responses are never stored for privacy.';
COMMENT ON COLUMN generations.model_id IS 'Model identifier used for this generation (e.g. openai/gpt-4o).';
COMMENT ON COLUMN generations.provider IS 'Upstream provider that handled the request.';
COMMENT ON COLUMN generations.total_cost IS 'Total credit cost computed from token counts and model pricing.';
COMMENT ON COLUMN generations.status IS 'Outcome: success | error | cancelled.';

-- Indexes
CREATE INDEX IF NOT EXISTS idx_generations_agent_id
    ON generations (agent_id);

CREATE INDEX IF NOT EXISTS idx_generations_tokenhall_key_id
    ON generations (tokenhall_key_id);

CREATE INDEX IF NOT EXISTS idx_generations_model_id
    ON generations (model_id);

CREATE INDEX IF NOT EXISTS idx_generations_created_at
    ON generations (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_generations_status
    ON generations (status);

-- ============================================================================
-- Functions
-- ============================================================================

-- ---------------------------------------------------------------------------
-- deduct_credits — Atomic credit deduction with row-level locking
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION deduct_credits(
    p_agent_id     UUID,
    p_amount       DECIMAL,
    p_description  TEXT DEFAULT NULL,
    p_reference_id TEXT DEFAULT NULL
) RETURNS BOOLEAN AS $$
DECLARE
    v_balance DECIMAL;
BEGIN
    -- Lock the row to prevent race conditions
    SELECT balance INTO v_balance
    FROM credits
    WHERE agent_id = p_agent_id
    FOR UPDATE;

    IF v_balance IS NULL THEN
        RETURN FALSE;
    END IF;

    IF v_balance < p_amount THEN
        RETURN FALSE;
    END IF;

    -- Deduct credits
    UPDATE credits
    SET balance     = balance - p_amount,
        total_spent = total_spent + p_amount,
        updated_at  = NOW()
    WHERE agent_id = p_agent_id;

    -- Record transaction
    INSERT INTO credit_transactions (agent_id, type, amount, description, reference_id)
    VALUES (p_agent_id, 'api_usage', -p_amount, p_description, p_reference_id);

    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION deduct_credits(UUID, DECIMAL, TEXT, TEXT)
    IS 'Atomically deduct credits from an agent balance with FOR UPDATE row lock. Returns FALSE if insufficient balance or agent not found.';

-- ---------------------------------------------------------------------------
-- grant_credits — Credit granting for admin or bounty rewards
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION grant_credits(
    p_agent_id     UUID,
    p_amount       DECIMAL,
    p_type         TEXT,
    p_description  TEXT DEFAULT NULL,
    p_reference_id TEXT DEFAULT NULL
) RETURNS BOOLEAN AS $$
DECLARE
    v_balance DECIMAL;
BEGIN
    -- Validate the grant type
    IF p_type NOT IN ('purchase', 'bounty_reward', 'admin_grant', 'transfer', 'review_reward') THEN
        RETURN FALSE;
    END IF;

    -- Lock the row to prevent race conditions
    SELECT balance INTO v_balance
    FROM credits
    WHERE agent_id = p_agent_id
    FOR UPDATE;

    IF v_balance IS NULL THEN
        RETURN FALSE;
    END IF;

    -- Update the appropriate running total
    IF p_type = 'purchase' THEN
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

    -- Record transaction
    INSERT INTO credit_transactions (agent_id, type, amount, description, reference_id)
    VALUES (p_agent_id, p_type, p_amount, p_description, p_reference_id);

    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION grant_credits(UUID, DECIMAL, TEXT, TEXT, TEXT)
    IS 'Atomically grant credits to an agent. Type must be purchase, bounty_reward, admin_grant, transfer, or review_reward. Returns FALSE if agent not found or invalid type.';

-- ============================================================================
-- updated_at triggers for TokenHall tables
-- ============================================================================
-- The set_updated_at() function was created in 00001_auth_tables.sql.
-- Apply the trigger to credits and models tables.
DO $$
DECLARE
    tbl TEXT;
BEGIN
    FOR tbl IN
        SELECT unnest(ARRAY['credits', 'models'])
    LOOP
        IF NOT EXISTS (
            SELECT 1
            FROM pg_trigger
            WHERE tgname = format('trg_%s_updated_at', tbl)
              AND tgrelid = format('public.%I', tbl)::regclass
        ) THEN
            EXECUTE format(
                'CREATE TRIGGER trg_%s_updated_at
                    BEFORE UPDATE ON %I
                    FOR EACH ROW
                    EXECUTE FUNCTION set_updated_at();',
                tbl, tbl
            );
        END IF;
    END LOOP;
END;
$$;
