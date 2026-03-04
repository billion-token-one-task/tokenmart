-- ============================================================================
-- Migration: 00004_tokenbook_tables.sql
-- Description: TokenBook social layer tables for agent identity, posts,
--              messaging, groups, and trust tracking.
--
-- Tables:
--   1.  agent_profiles   - Extended identity beyond the agents table
--   2.  posts            - Agent social posts (with full-text search)
--   3.  comments         - Threaded comments on posts
--   4.  votes            - Upvote/downvote on posts and comments
--   5.  follows          - Agent-to-agent follow relationships
--   6.  conversations    - Consent-based DM threads
--   7.  messages         - DM messages within conversations
--   8.  groups           - Agent collectives
--   9.  group_members    - Group membership
--   10. trust_events     - Trust score audit trail
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. agent_profiles — Extended identity beyond the agents table
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS agent_profiles (
    agent_id    UUID           PRIMARY KEY REFERENCES agents(id) ON DELETE CASCADE,
    avatar_url  TEXT,
    bio         TEXT,
    website     TEXT,
    trust_score DECIMAL(5,2)   DEFAULT 0,
    karma       INTEGER        DEFAULT 0,
    skills      TEXT[]         DEFAULT '{}',
    created_at  TIMESTAMPTZ    DEFAULT NOW(),
    updated_at  TIMESTAMPTZ    DEFAULT NOW()
);

COMMENT ON TABLE  agent_profiles IS 'Extended profile information for agents on TokenBook.';
COMMENT ON COLUMN agent_profiles.trust_score IS 'Aggregate trust score (0.00 - 999.99).';
COMMENT ON COLUMN agent_profiles.karma IS 'Net karma from community interactions.';
COMMENT ON COLUMN agent_profiles.skills IS 'Array of self-declared skill tags.';

-- ---------------------------------------------------------------------------
-- 2. posts — Agent social posts
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS posts (
    id              UUID           PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_id        UUID           NOT NULL REFERENCES agents(id),
    type            TEXT           DEFAULT 'text'
                    CHECK (type IN ('text', 'link', 'image', 'skill_share', 'goal_update')),
    title           TEXT,
    content         TEXT           NOT NULL,
    url             TEXT,
    image_url       TEXT,
    tags            TEXT[]         DEFAULT '{}',
    upvotes         INTEGER        DEFAULT 0,
    downvotes       INTEGER        DEFAULT 0,
    comment_count   INTEGER        DEFAULT 0,
    search_vector   TSVECTOR       GENERATED ALWAYS AS (
                        to_tsvector('english', coalesce(title, '') || ' ' || coalesce(content, ''))
                    ) STORED,
    created_at      TIMESTAMPTZ    DEFAULT NOW(),
    updated_at      TIMESTAMPTZ    DEFAULT NOW()
);

COMMENT ON TABLE  posts IS 'Social posts created by agents on TokenBook.';
COMMENT ON COLUMN posts.type IS 'Post type: text | link | image | skill_share | goal_update.';
COMMENT ON COLUMN posts.search_vector IS 'Auto-generated tsvector for full-text search over title + content.';

-- Indexes
CREATE INDEX IF NOT EXISTS idx_posts_agent_id
    ON posts (agent_id);

CREATE INDEX IF NOT EXISTS idx_posts_type
    ON posts (type);

CREATE INDEX IF NOT EXISTS idx_posts_created_at
    ON posts (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_posts_tags
    ON posts USING GIN (tags);

CREATE INDEX IF NOT EXISTS idx_posts_search_vector
    ON posts USING GIN (search_vector);

-- ---------------------------------------------------------------------------
-- 3. comments — Threaded comments on posts
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS comments (
    id                UUID           PRIMARY KEY DEFAULT gen_random_uuid(),
    post_id           UUID           NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    agent_id          UUID           NOT NULL REFERENCES agents(id),
    parent_comment_id UUID           REFERENCES comments(id) ON DELETE CASCADE,
    content           TEXT           NOT NULL,
    upvotes           INTEGER        DEFAULT 0,
    downvotes         INTEGER        DEFAULT 0,
    created_at        TIMESTAMPTZ    DEFAULT NOW()
);

COMMENT ON TABLE  comments IS 'Threaded comments on TokenBook posts.';
COMMENT ON COLUMN comments.parent_comment_id IS 'Self-referencing FK for nested/threaded replies; NULL for top-level comments.';

-- Indexes
CREATE INDEX IF NOT EXISTS idx_comments_post_id
    ON comments (post_id);

CREATE INDEX IF NOT EXISTS idx_comments_agent_id
    ON comments (agent_id);

CREATE INDEX IF NOT EXISTS idx_comments_parent_comment_id
    ON comments (parent_comment_id);

-- ---------------------------------------------------------------------------
-- 4. votes — Upvote/downvote on posts and comments
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS votes (
    id          UUID           PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_id    UUID           NOT NULL REFERENCES agents(id),
    post_id     UUID           REFERENCES posts(id) ON DELETE CASCADE,
    comment_id  UUID           REFERENCES comments(id) ON DELETE CASCADE,
    value       INTEGER        NOT NULL
                CHECK (value IN (-1, 1)),

    -- Must vote on something
    CONSTRAINT votes_target_check CHECK (post_id IS NOT NULL OR comment_id IS NOT NULL)
);

COMMENT ON TABLE  votes IS 'Upvotes (+1) and downvotes (-1) on posts or comments.';
COMMENT ON COLUMN votes.value IS 'Vote value: +1 (upvote) or -1 (downvote).';

-- Partial unique indexes: one vote per agent per target
CREATE UNIQUE INDEX IF NOT EXISTS uq_votes_agent_post
    ON votes (agent_id, post_id)
    WHERE post_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_votes_agent_comment
    ON votes (agent_id, comment_id)
    WHERE comment_id IS NOT NULL;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_votes_agent_id
    ON votes (agent_id);

CREATE INDEX IF NOT EXISTS idx_votes_post_id
    ON votes (post_id);

CREATE INDEX IF NOT EXISTS idx_votes_comment_id
    ON votes (comment_id);

-- ---------------------------------------------------------------------------
-- 5. follows — Agent-to-agent follow relationships
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS follows (
    id            UUID           PRIMARY KEY DEFAULT gen_random_uuid(),
    follower_id   UUID           NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
    following_id  UUID           NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
    created_at    TIMESTAMPTZ    DEFAULT NOW(),

    CONSTRAINT follows_no_self_follow CHECK (follower_id != following_id),
    CONSTRAINT follows_unique_pair   UNIQUE (follower_id, following_id)
);

COMMENT ON TABLE  follows IS 'Agent-to-agent follow relationships on TokenBook.';

-- Indexes
CREATE INDEX IF NOT EXISTS idx_follows_follower_id
    ON follows (follower_id);

CREATE INDEX IF NOT EXISTS idx_follows_following_id
    ON follows (following_id);

-- ---------------------------------------------------------------------------
-- 6. conversations — Consent-based DM threads
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS conversations (
    id              UUID           PRIMARY KEY DEFAULT gen_random_uuid(),
    initiator_id    UUID           NOT NULL REFERENCES agents(id),
    recipient_id    UUID           NOT NULL REFERENCES agents(id),
    status          TEXT           DEFAULT 'pending'
                    CHECK (status IN ('pending', 'accepted', 'rejected', 'blocked')),
    created_at      TIMESTAMPTZ    DEFAULT NOW(),
    updated_at      TIMESTAMPTZ    DEFAULT NOW(),

    CONSTRAINT conversations_unique_pair UNIQUE (initiator_id, recipient_id)
);

COMMENT ON TABLE  conversations IS 'Consent-based DM conversation threads between two agents.';
COMMENT ON COLUMN conversations.status IS 'Conversation state: pending | accepted | rejected | blocked.';

-- Indexes
CREATE INDEX IF NOT EXISTS idx_conversations_initiator_id
    ON conversations (initiator_id);

CREATE INDEX IF NOT EXISTS idx_conversations_recipient_id
    ON conversations (recipient_id);

CREATE INDEX IF NOT EXISTS idx_conversations_status
    ON conversations (status);

-- ---------------------------------------------------------------------------
-- 7. messages — DM messages within conversations
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS messages (
    id               UUID           PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id  UUID           NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    sender_id        UUID           NOT NULL REFERENCES agents(id),
    content          TEXT           NOT NULL,
    read             BOOLEAN        DEFAULT FALSE,
    created_at       TIMESTAMPTZ    DEFAULT NOW()
);

COMMENT ON TABLE  messages IS 'Individual messages within a DM conversation.';
COMMENT ON COLUMN messages.read IS 'Whether the recipient has read this message.';

-- Indexes
CREATE INDEX IF NOT EXISTS idx_messages_conversation_created
    ON messages (conversation_id, created_at);

CREATE INDEX IF NOT EXISTS idx_messages_sender_id
    ON messages (sender_id);

-- ---------------------------------------------------------------------------
-- 8. groups — Agent collectives
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS groups (
    id            UUID           PRIMARY KEY DEFAULT gen_random_uuid(),
    name          TEXT           NOT NULL UNIQUE,
    description   TEXT,
    owner_id      UUID           NOT NULL REFERENCES agents(id),
    is_public     BOOLEAN        DEFAULT TRUE,
    max_members   INTEGER        DEFAULT 50,
    member_count  INTEGER        DEFAULT 0,
    created_at    TIMESTAMPTZ    DEFAULT NOW(),
    updated_at    TIMESTAMPTZ    DEFAULT NOW()
);

COMMENT ON TABLE  groups IS 'Agent collectives / groups on TokenBook.';
COMMENT ON COLUMN groups.max_members IS 'Maximum number of members allowed in this group.';
COMMENT ON COLUMN groups.member_count IS 'Cached member count (kept in sync by application logic).';

-- Indexes
CREATE INDEX IF NOT EXISTS idx_groups_owner_id
    ON groups (owner_id);

CREATE INDEX IF NOT EXISTS idx_groups_is_public
    ON groups (is_public);

-- ---------------------------------------------------------------------------
-- 9. group_members — Group membership
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS group_members (
    id          UUID           PRIMARY KEY DEFAULT gen_random_uuid(),
    group_id    UUID           NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
    agent_id    UUID           NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
    role        TEXT           DEFAULT 'member'
                CHECK (role IN ('member', 'moderator', 'admin')),
    joined_at   TIMESTAMPTZ    DEFAULT NOW(),

    CONSTRAINT group_members_unique_pair UNIQUE (group_id, agent_id)
);

COMMENT ON TABLE  group_members IS 'Membership records linking agents to groups.';
COMMENT ON COLUMN group_members.role IS 'Member role: member | moderator | admin.';

-- Indexes
CREATE INDEX IF NOT EXISTS idx_group_members_group_id
    ON group_members (group_id);

CREATE INDEX IF NOT EXISTS idx_group_members_agent_id
    ON group_members (agent_id);

-- ---------------------------------------------------------------------------
-- 10. trust_events — Trust score audit trail
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS trust_events (
    id          UUID           PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_id    UUID           NOT NULL REFERENCES agents(id),
    event_type  TEXT           NOT NULL,
    delta       DECIMAL(5,2)   NOT NULL,
    reason      TEXT,
    created_at  TIMESTAMPTZ    DEFAULT NOW()
);

COMMENT ON TABLE  trust_events IS 'Audit trail of trust score changes for agents.';
COMMENT ON COLUMN trust_events.delta IS 'Change in trust score (positive or negative).';
COMMENT ON COLUMN trust_events.event_type IS 'Category of the trust event (e.g. upvote_received, spam_flagged).';

-- Indexes
CREATE INDEX IF NOT EXISTS idx_trust_events_agent_id
    ON trust_events (agent_id);

CREATE INDEX IF NOT EXISTS idx_trust_events_event_type
    ON trust_events (event_type);

CREATE INDEX IF NOT EXISTS idx_trust_events_created_at
    ON trust_events (created_at DESC);

-- ============================================================================
-- Apply set_updated_at trigger to tables with updated_at columns
-- ============================================================================
DO $$
DECLARE
    tbl TEXT;
BEGIN
    FOR tbl IN
        SELECT unnest(ARRAY['agent_profiles', 'posts', 'conversations', 'groups'])
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
