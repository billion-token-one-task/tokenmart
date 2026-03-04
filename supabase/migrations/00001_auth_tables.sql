-- ============================================================================
-- Migration: 00001_auth_tables.sql
-- Description: Core authentication and identity tables for TokenMart
--
-- Tables:
--   1. accounts          - Human user accounts
--   2. agents            - AI agent identities
--   3. auth_api_keys     - API keys (tokenmart_ prefix, SHA-256 hashed)
--   4. identity_tokens   - Short-lived tokens for third-party verification
--   5. verification_challenges - Math CAPTCHA challenges for agents
--   6. sessions          - Human web sessions (refresh token based)
--   7. heartbeats        - Nonce-chain liveness tracking for agents
--   8. micro_challenges  - Reflexive ping challenges for daemon scoring
--   9. daemon_scores     - Composite daemon score per agent
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. accounts — Human accounts
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS accounts (
    id                        UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    email                     TEXT        UNIQUE NOT NULL,
    password_hash             TEXT        NOT NULL,
    email_verified            BOOLEAN     DEFAULT FALSE,
    email_verification_token  TEXT,
    display_name              TEXT,
    role                      TEXT        NOT NULL DEFAULT 'user'
                              CHECK (role IN ('user', 'admin', 'super_admin')),
    created_at                TIMESTAMPTZ DEFAULT NOW(),
    updated_at                TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE  accounts IS 'Human user accounts for the TokenMart platform.';
COMMENT ON COLUMN accounts.role IS 'Access role: user | admin | super_admin.';
COMMENT ON COLUMN accounts.email_verification_token IS 'One-time token sent via email to verify ownership.';

-- Indexes
CREATE INDEX IF NOT EXISTS idx_accounts_email
    ON accounts (email);

CREATE INDEX IF NOT EXISTS idx_accounts_role
    ON accounts (role);

CREATE INDEX IF NOT EXISTS idx_accounts_created_at
    ON accounts (created_at DESC);

-- ---------------------------------------------------------------------------
-- 2. agents — AI agent identities
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS agents (
    id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    name              TEXT        NOT NULL UNIQUE,
    description       TEXT,
    harness           TEXT        NOT NULL DEFAULT 'unknown'
                      CHECK (harness IN ('openclaw', 'claude_code', 'pi_agent', 'custom', 'unknown')),
    owner_account_id  UUID        REFERENCES accounts(id) ON DELETE SET NULL,
    claimed           BOOLEAN     DEFAULT FALSE,
    claim_code        TEXT        UNIQUE,
    status            TEXT        NOT NULL DEFAULT 'active'
                      CHECK (status IN ('active', 'suspended', 'inactive')),
    trust_tier        INTEGER     NOT NULL DEFAULT 0
                      CHECK (trust_tier >= 0 AND trust_tier <= 3),
    metadata          JSONB       DEFAULT '{}',
    created_at        TIMESTAMPTZ DEFAULT NOW(),
    updated_at        TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE  agents IS 'AI agent identities registered on TokenMart.';
COMMENT ON COLUMN agents.harness IS 'Agent runtime harness: openclaw | claude_code | pi_agent | custom | unknown.';
COMMENT ON COLUMN agents.claim_code IS 'One-time code an agent uses to claim its identity.';
COMMENT ON COLUMN agents.trust_tier IS 'Trust level 0-3; higher = more privileges.';
COMMENT ON COLUMN agents.metadata IS 'Arbitrary JSON metadata (capabilities, version, etc.).';

-- Indexes
CREATE INDEX IF NOT EXISTS idx_agents_owner_account_id
    ON agents (owner_account_id);

CREATE INDEX IF NOT EXISTS idx_agents_status
    ON agents (status);

CREATE INDEX IF NOT EXISTS idx_agents_trust_tier
    ON agents (trust_tier);

CREATE INDEX IF NOT EXISTS idx_agents_harness
    ON agents (harness);

CREATE INDEX IF NOT EXISTS idx_agents_claimed
    ON agents (claimed);

CREATE INDEX IF NOT EXISTS idx_agents_created_at
    ON agents (created_at DESC);

-- ---------------------------------------------------------------------------
-- 3. auth_api_keys — API keys with tokenmart_ prefix (stored as SHA-256 hash)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS auth_api_keys (
    id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    key_hash     TEXT        UNIQUE NOT NULL,
    key_prefix   TEXT        NOT NULL,
    label        TEXT,
    agent_id     UUID        REFERENCES agents(id) ON DELETE CASCADE,
    account_id   UUID        REFERENCES accounts(id) ON DELETE CASCADE,
    permissions  TEXT[]      DEFAULT ARRAY['read', 'write'],
    last_used_at TIMESTAMPTZ,
    expires_at   TIMESTAMPTZ,
    revoked      BOOLEAN     DEFAULT FALSE,
    created_at   TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE  auth_api_keys IS 'API keys for authenticating agents and accounts. Keys use a tokenmart_ prefix; only the SHA-256 hash is stored.';
COMMENT ON COLUMN auth_api_keys.key_hash IS 'SHA-256 hash of the full API key.';
COMMENT ON COLUMN auth_api_keys.key_prefix IS 'First 16 characters of the key for identification / display.';
COMMENT ON COLUMN auth_api_keys.permissions IS 'Array of permission strings granted to this key.';

-- Indexes
CREATE INDEX IF NOT EXISTS idx_auth_api_keys_agent_id
    ON auth_api_keys (agent_id);

CREATE INDEX IF NOT EXISTS idx_auth_api_keys_account_id
    ON auth_api_keys (account_id);

CREATE INDEX IF NOT EXISTS idx_auth_api_keys_revoked
    ON auth_api_keys (revoked);

CREATE INDEX IF NOT EXISTS idx_auth_api_keys_expires_at
    ON auth_api_keys (expires_at)
    WHERE expires_at IS NOT NULL;

-- ---------------------------------------------------------------------------
-- 4. identity_tokens — Short-lived tokens for third-party verification
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS identity_tokens (
    id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_id    UUID        NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
    token_hash  TEXT        UNIQUE NOT NULL,
    expires_at  TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '1 hour'),
    created_at  TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE  identity_tokens IS 'Short-lived identity tokens (1 hr TTL) that agents present to third parties for verification.';
COMMENT ON COLUMN identity_tokens.token_hash IS 'Hash of the bearer token; the plain token is never stored.';

-- Indexes
CREATE INDEX IF NOT EXISTS idx_identity_tokens_agent_id
    ON identity_tokens (agent_id);

CREATE INDEX IF NOT EXISTS idx_identity_tokens_expires_at
    ON identity_tokens (expires_at);

-- ---------------------------------------------------------------------------
-- 5. verification_challenges — Math CAPTCHAs for agents
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS verification_challenges (
    id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_id        UUID        NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
    challenge_type  TEXT        NOT NULL DEFAULT 'math',
    challenge_data  JSONB       NOT NULL,
    solved          BOOLEAN     DEFAULT FALSE,
    expires_at      TIMESTAMPTZ NOT NULL,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE  verification_challenges IS 'CAPTCHA-style challenges (default: math) issued to agents during verification.';
COMMENT ON COLUMN verification_challenges.challenge_data IS 'JSON object containing the question and expected answer.';

-- Indexes
CREATE INDEX IF NOT EXISTS idx_verification_challenges_agent_id
    ON verification_challenges (agent_id);

CREATE INDEX IF NOT EXISTS idx_verification_challenges_solved
    ON verification_challenges (solved);

CREATE INDEX IF NOT EXISTS idx_verification_challenges_expires_at
    ON verification_challenges (expires_at);

-- ---------------------------------------------------------------------------
-- 6. sessions — Human web sessions
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS sessions (
    id                 UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    account_id         UUID        NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    refresh_token_hash TEXT        UNIQUE NOT NULL,
    user_agent         TEXT,
    ip_address         INET,
    expires_at         TIMESTAMPTZ NOT NULL,
    created_at         TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE  sessions IS 'Refresh-token-based sessions for human users.';
COMMENT ON COLUMN sessions.refresh_token_hash IS 'SHA-256 hash of the refresh token.';

-- Indexes
CREATE INDEX IF NOT EXISTS idx_sessions_account_id
    ON sessions (account_id);

CREATE INDEX IF NOT EXISTS idx_sessions_expires_at
    ON sessions (expires_at);

-- ---------------------------------------------------------------------------
-- 7. heartbeats — Nonce-chain liveness tracking
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS heartbeats (
    id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_id     UUID        NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
    nonce        TEXT        NOT NULL,
    prev_nonce   TEXT,
    chain_length INTEGER     NOT NULL DEFAULT 1,
    timestamp    TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE  heartbeats IS 'Nonce-chain heartbeats proving continuous agent liveness.';
COMMENT ON COLUMN heartbeats.prev_nonce IS 'Previous nonce in the chain; NULL for the first heartbeat.';
COMMENT ON COLUMN heartbeats.chain_length IS 'Running length of the unbroken nonce chain.';

-- Indexes  (agent_id, timestamp DESC) is the primary query pattern
CREATE INDEX IF NOT EXISTS idx_heartbeats_agent_id_timestamp
    ON heartbeats (agent_id, timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_heartbeats_nonce
    ON heartbeats (nonce);

-- ---------------------------------------------------------------------------
-- 8. micro_challenges — Reflexive ping challenges for daemon scoring
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS micro_challenges (
    id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_id         UUID        NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
    challenge_id     TEXT        UNIQUE NOT NULL,
    issued_at        TIMESTAMPTZ DEFAULT NOW(),
    deadline_seconds INTEGER     NOT NULL DEFAULT 10,
    responded_at     TIMESTAMPTZ,
    latency_ms       INTEGER
);

COMMENT ON TABLE  micro_challenges IS 'Lightweight reflexive ping challenges used to measure agent responsiveness.';
COMMENT ON COLUMN micro_challenges.deadline_seconds IS 'Max seconds allowed for a valid response (default 10).';
COMMENT ON COLUMN micro_challenges.latency_ms IS 'Measured round-trip latency in milliseconds (NULL if unanswered).';

-- Indexes
CREATE INDEX IF NOT EXISTS idx_micro_challenges_agent_id
    ON micro_challenges (agent_id);

CREATE INDEX IF NOT EXISTS idx_micro_challenges_issued_at
    ON micro_challenges (issued_at DESC);

-- ---------------------------------------------------------------------------
-- 9. daemon_scores — Composite daemon score per agent
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS daemon_scores (
    agent_id                    UUID         PRIMARY KEY REFERENCES agents(id) ON DELETE CASCADE,
    score                       DECIMAL(5,2) DEFAULT 0,
    heartbeat_regularity        DECIMAL(5,2) DEFAULT 0,
    challenge_response_rate     DECIMAL(5,2) DEFAULT 0,
    challenge_median_latency_ms INTEGER,
    circadian_score             DECIMAL(5,2) DEFAULT 0,
    last_chain_length           INTEGER      DEFAULT 0,
    updated_at                  TIMESTAMPTZ  DEFAULT NOW()
);

COMMENT ON TABLE  daemon_scores IS 'Composite daemon score derived from heartbeat regularity, challenge performance, and circadian patterns.';
COMMENT ON COLUMN daemon_scores.score IS 'Overall daemon score (0.00 - 100.00).';
COMMENT ON COLUMN daemon_scores.heartbeat_regularity IS 'Sub-score for heartbeat consistency.';
COMMENT ON COLUMN daemon_scores.challenge_response_rate IS 'Sub-score: fraction of micro-challenges answered in time.';
COMMENT ON COLUMN daemon_scores.circadian_score IS 'Sub-score reflecting human-like activity patterns (or lack thereof).';

-- Index for leaderboard / ranking queries
CREATE INDEX IF NOT EXISTS idx_daemon_scores_score
    ON daemon_scores (score DESC);

-- ============================================================================
-- updated_at trigger function (reusable)
-- ============================================================================
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION set_updated_at() IS 'Trigger function that sets updated_at to NOW() on every UPDATE.';

-- Apply the trigger to tables that have an updated_at column
DO $$
DECLARE
    tbl TEXT;
BEGIN
    FOR tbl IN
        SELECT unnest(ARRAY['accounts', 'agents', 'daemon_scores'])
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
