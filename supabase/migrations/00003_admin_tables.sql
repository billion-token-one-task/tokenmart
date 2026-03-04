-- ============================================================================
-- Migration: 00003_admin_tables.sql
-- Description: TB_Admin tables — Task/bounty orchestration, peer review,
--              behavioral analysis, and Sybil-detection layer
--
-- Tables:
--   1. tasks               - Top-level work items
--   2. goals               - Nested goal hierarchy (materialized path + adjacency)
--   3. bounties            - Public reward offers linked to tasks/goals
--   4. bounty_claims       - Agent claims and submissions for bounties
--   5. peer_reviews        - Review assignments (3 per submission)
--   6. behavioral_vectors  - Per-agent behavioral fingerprint
--   7. correlation_flags   - Flagged agent pairs with high behavioral correlation
--
-- Triggers:
--   - set_updated_at on tasks, goals, bounties
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. tasks — Top-level work items
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS tasks (
    id            UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
    title         TEXT          NOT NULL,
    description   TEXT,
    status        TEXT          NOT NULL DEFAULT 'open'
                  CHECK (status IN ('open', 'in_progress', 'completed', 'cancelled')),
    passing_spec  TEXT,
    credit_reward DECIMAL(20,8) DEFAULT 0,
    created_by    UUID          REFERENCES accounts(id),
    assigned_to   UUID          REFERENCES agents(id),
    created_at    TIMESTAMPTZ   DEFAULT NOW(),
    updated_at    TIMESTAMPTZ   DEFAULT NOW()
);

COMMENT ON TABLE  tasks IS 'Top-level work items that can be decomposed into goals and bounties.';
COMMENT ON COLUMN tasks.status IS 'Workflow state: open | in_progress | completed | cancelled.';
COMMENT ON COLUMN tasks.passing_spec IS 'Acceptance criteria or specification that defines when the task is complete.';
COMMENT ON COLUMN tasks.credit_reward IS 'Total credit reward allocated for completing this task.';
COMMENT ON COLUMN tasks.created_by IS 'Account that created this task.';
COMMENT ON COLUMN tasks.assigned_to IS 'Agent currently assigned to work on this task.';

-- Indexes
CREATE INDEX IF NOT EXISTS idx_tasks_status
    ON tasks (status);

CREATE INDEX IF NOT EXISTS idx_tasks_created_by
    ON tasks (created_by);

CREATE INDEX IF NOT EXISTS idx_tasks_assigned_to
    ON tasks (assigned_to);

CREATE INDEX IF NOT EXISTS idx_tasks_created_at
    ON tasks (created_at DESC);

-- ---------------------------------------------------------------------------
-- 2. goals — Nested hierarchy with materialized path + adjacency list
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS goals (
    id                    UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id               UUID        NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    parent_goal_id        UUID        REFERENCES goals(id) ON DELETE CASCADE,
    path                  TEXT        DEFAULT '',
    title                 TEXT        NOT NULL,
    description           TEXT,
    status                TEXT        DEFAULT 'pending'
                          CHECK (status IN ('pending', 'in_progress', 'completed', 'failed')),
    passing_spec          TEXT,
    requires_all_subgoals BOOLEAN     DEFAULT FALSE,
    created_at            TIMESTAMPTZ DEFAULT NOW(),
    updated_at            TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE  goals IS 'Nested goal hierarchy within a task. Uses materialized path + adjacency list for efficient tree queries.';
COMMENT ON COLUMN goals.path IS 'Materialized path for efficient subtree queries (e.g. "root.child.grandchild").';
COMMENT ON COLUMN goals.status IS 'Goal state: pending | in_progress | completed | failed.';
COMMENT ON COLUMN goals.passing_spec IS 'Acceptance criteria for this goal.';
COMMENT ON COLUMN goals.requires_all_subgoals IS 'If TRUE, all child goals must be completed before this goal can be marked complete.';

-- Indexes
CREATE INDEX IF NOT EXISTS idx_goals_task_id
    ON goals (task_id);

CREATE INDEX IF NOT EXISTS idx_goals_parent_goal_id
    ON goals (parent_goal_id);

CREATE INDEX IF NOT EXISTS idx_goals_path
    ON goals (path text_pattern_ops);

CREATE INDEX IF NOT EXISTS idx_goals_status
    ON goals (status);

-- ---------------------------------------------------------------------------
-- 3. bounties — Public reward offers
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS bounties (
    id            UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id       UUID          REFERENCES tasks(id),
    goal_id       UUID          REFERENCES goals(id),
    title         TEXT          NOT NULL,
    description   TEXT,
    type          TEXT          DEFAULT 'work'
                  CHECK (type IN ('work', 'verification')),
    status        TEXT          DEFAULT 'open'
                  CHECK (status IN ('open', 'claimed', 'submitted', 'approved', 'rejected', 'cancelled')),
    credit_reward DECIMAL(20,8) DEFAULT 0,
    deadline      TIMESTAMPTZ,
    created_by    UUID          REFERENCES accounts(id),
    created_at    TIMESTAMPTZ   DEFAULT NOW(),
    updated_at    TIMESTAMPTZ   DEFAULT NOW()
);

COMMENT ON TABLE  bounties IS 'Public reward offers linked to tasks or goals. Agents claim bounties and submit work for review.';
COMMENT ON COLUMN bounties.type IS 'Bounty type: work (do the task) | verification (review someone else''s work).';
COMMENT ON COLUMN bounties.status IS 'Lifecycle state: open | claimed | submitted | approved | rejected | cancelled.';
COMMENT ON COLUMN bounties.credit_reward IS 'Credit reward paid upon approval.';
COMMENT ON COLUMN bounties.deadline IS 'Optional deadline after which the bounty expires.';
COMMENT ON COLUMN bounties.created_by IS 'Account that created this bounty.';

-- Indexes
CREATE INDEX IF NOT EXISTS idx_bounties_status
    ON bounties (status);

CREATE INDEX IF NOT EXISTS idx_bounties_type
    ON bounties (type);

CREATE INDEX IF NOT EXISTS idx_bounties_task_id
    ON bounties (task_id);

CREATE INDEX IF NOT EXISTS idx_bounties_goal_id
    ON bounties (goal_id);

CREATE INDEX IF NOT EXISTS idx_bounties_deadline
    ON bounties (deadline);

CREATE INDEX IF NOT EXISTS idx_bounties_created_at
    ON bounties (created_at DESC);

-- ---------------------------------------------------------------------------
-- 4. bounty_claims — Agent claims and submissions
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS bounty_claims (
    id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    bounty_id       UUID        NOT NULL REFERENCES bounties(id),
    agent_id        UUID        NOT NULL REFERENCES agents(id),
    status          TEXT        DEFAULT 'claimed'
                    CHECK (status IN ('claimed', 'submitted', 'approved', 'rejected')),
    submission_text TEXT,
    submitted_at    TIMESTAMPTZ,
    created_at      TIMESTAMPTZ DEFAULT NOW(),

    CONSTRAINT uq_bounty_claims_bounty_agent UNIQUE (bounty_id, agent_id)
);

COMMENT ON TABLE  bounty_claims IS 'Agent claims on bounties. One claim per agent per bounty.';
COMMENT ON COLUMN bounty_claims.status IS 'Claim lifecycle: claimed | submitted | approved | rejected.';
COMMENT ON COLUMN bounty_claims.submission_text IS 'Free-text submission content provided by the agent.';
COMMENT ON COLUMN bounty_claims.submitted_at IS 'Timestamp when the agent submitted their work.';

-- Indexes
CREATE INDEX IF NOT EXISTS idx_bounty_claims_bounty_id
    ON bounty_claims (bounty_id);

CREATE INDEX IF NOT EXISTS idx_bounty_claims_agent_id
    ON bounty_claims (agent_id);

CREATE INDEX IF NOT EXISTS idx_bounty_claims_status
    ON bounty_claims (status);

-- ---------------------------------------------------------------------------
-- 5. peer_reviews — Review assignments (3 per submission)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS peer_reviews (
    id                     UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
    bounty_claim_id        UUID          NOT NULL REFERENCES bounty_claims(id),
    reviewer_agent_id      UUID          NOT NULL REFERENCES agents(id),
    decision               TEXT          CHECK (decision IN ('approve', 'reject')),
    review_notes           TEXT,
    reviewer_reward_credits DECIMAL(20,8) DEFAULT 0,
    submitted_at           TIMESTAMPTZ,
    created_at             TIMESTAMPTZ   DEFAULT NOW(),

    CONSTRAINT uq_peer_reviews_claim_reviewer UNIQUE (bounty_claim_id, reviewer_agent_id)
);

COMMENT ON TABLE  peer_reviews IS 'Peer review assignments for bounty submissions. Typically 3 reviewers per submission.';
COMMENT ON COLUMN peer_reviews.decision IS 'Review outcome: approve | reject. NULL until the reviewer submits.';
COMMENT ON COLUMN peer_reviews.review_notes IS 'Free-text feedback from the reviewer.';
COMMENT ON COLUMN peer_reviews.reviewer_reward_credits IS 'Credits earned by the reviewer for completing this review.';

-- Indexes
CREATE INDEX IF NOT EXISTS idx_peer_reviews_bounty_claim_id
    ON peer_reviews (bounty_claim_id);

CREATE INDEX IF NOT EXISTS idx_peer_reviews_reviewer_agent_id
    ON peer_reviews (reviewer_agent_id);

CREATE INDEX IF NOT EXISTS idx_peer_reviews_decision
    ON peer_reviews (decision);

-- ---------------------------------------------------------------------------
-- 6. behavioral_vectors — Per-agent behavioral fingerprint
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS behavioral_vectors (
    agent_id   UUID        PRIMARY KEY REFERENCES agents(id) ON DELETE CASCADE,
    vector     JSONB       DEFAULT '{}',
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE  behavioral_vectors IS 'Per-agent behavioral fingerprint used for Sybil detection and behavioral analysis.';
COMMENT ON COLUMN behavioral_vectors.vector IS 'JSON object containing behavioral feature vector components.';

-- ---------------------------------------------------------------------------
-- 7. correlation_flags — Flagged agent pairs with high behavioral correlation
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS correlation_flags (
    id                UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_a_id        UUID          NOT NULL REFERENCES agents(id),
    agent_b_id        UUID          NOT NULL REFERENCES agents(id),
    correlation_score DECIMAL(5,4)  NOT NULL,
    flagged_at        TIMESTAMPTZ   DEFAULT NOW(),

    CONSTRAINT uq_correlation_flags_pair UNIQUE (agent_a_id, agent_b_id),
    CONSTRAINT chk_correlation_flags_no_self CHECK (agent_a_id != agent_b_id)
);

COMMENT ON TABLE  correlation_flags IS 'Flagged agent pairs exhibiting high behavioral correlation, indicating potential Sybil accounts.';
COMMENT ON COLUMN correlation_flags.correlation_score IS 'Similarity score between the two agents (0.0000 to 1.0000).';
COMMENT ON COLUMN correlation_flags.flagged_at IS 'Timestamp when the correlation was first detected.';

-- Indexes
CREATE INDEX IF NOT EXISTS idx_correlation_flags_agent_a_id
    ON correlation_flags (agent_a_id);

CREATE INDEX IF NOT EXISTS idx_correlation_flags_agent_b_id
    ON correlation_flags (agent_b_id);

CREATE INDEX IF NOT EXISTS idx_correlation_flags_score
    ON correlation_flags (correlation_score DESC);

-- ============================================================================
-- updated_at triggers for TB_Admin tables
-- ============================================================================
-- The set_updated_at() function was created in 00001_auth_tables.sql.
-- Apply the trigger to tasks, goals, and bounties tables.
DO $$
DECLARE
    tbl TEXT;
BEGIN
    FOR tbl IN
        SELECT unnest(ARRAY['tasks', 'goals', 'bounties'])
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
