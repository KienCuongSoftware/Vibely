-- LIVE (phase 2): metadata, chat, interaction aggregates and moderation foundation.
-- Realtime state (viewer presence, hot like counters, rate limits) lives in Redis; these tables hold
-- persistent data and periodically flushed aggregates only.

CREATE TABLE IF NOT EXISTS lives (
    id                BIGSERIAL PRIMARY KEY,
    public_id         UUID         NOT NULL,
    host_id           BIGINT       NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    title             VARCHAR(80)  NOT NULL,
    description       VARCHAR(300),
    category          VARCHAR(32)  NOT NULL,
    cover_url         VARCHAR(512),
    status            VARCHAR(16)  NOT NULL DEFAULT 'CREATED',
    visibility        VARCHAR(16)  NOT NULL DEFAULT 'PUBLIC',
    allow_comments    BOOLEAN      NOT NULL DEFAULT TRUE,
    allow_gifts       BOOLEAN      NOT NULL DEFAULT TRUE,
    allow_guests      BOOLEAN      NOT NULL DEFAULT FALSE,
    mature_content    BOOLEAN      NOT NULL DEFAULT FALSE,
    viewer_count      BIGINT       NOT NULL DEFAULT 0,
    peak_viewer_count BIGINT       NOT NULL DEFAULT 0,
    like_count        BIGINT       NOT NULL DEFAULT 0,
    started_at        TIMESTAMP,
    ended_at          TIMESTAMP,
    version           BIGINT       NOT NULL DEFAULT 0,
    created_at        TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at        TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uk_lives_public_id UNIQUE (public_id),
    CONSTRAINT ck_lives_status CHECK (status IN ('CREATED', 'LIVE', 'ENDED', 'CANCELLED')),
    CONSTRAINT ck_lives_visibility CHECK (visibility IN ('PUBLIC', 'FOLLOWERS', 'FRIENDS')),
    CONSTRAINT ck_lives_counters CHECK (viewer_count >= 0 AND peak_viewer_count >= 0 AND like_count >= 0),
    CONSTRAINT ck_lives_started_at CHECK (status NOT IN ('LIVE', 'ENDED') OR started_at IS NOT NULL),
    CONSTRAINT ck_lives_ended_at CHECK (status <> 'ENDED' OR ended_at IS NOT NULL)
);

-- A host can broadcast at most one LIVE at a time (also guards concurrent start requests).
CREATE UNIQUE INDEX IF NOT EXISTS uq_lives_host_active
    ON lives (host_id) WHERE status = 'LIVE';

CREATE INDEX IF NOT EXISTS idx_lives_status_viewers
    ON lives (status, viewer_count DESC, started_at DESC);

CREATE INDEX IF NOT EXISTS idx_lives_status_category_viewers
    ON lives (status, category, viewer_count DESC);

CREATE INDEX IF NOT EXISTS idx_lives_host_created
    ON lives (host_id, created_at DESC);

CREATE TABLE IF NOT EXISTS live_comments (
    id                 BIGSERIAL PRIMARY KEY,
    live_id            BIGINT       NOT NULL REFERENCES lives (id) ON DELETE CASCADE,
    user_id            BIGINT       NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    content            VARCHAR(500) NOT NULL,
    deleted_at         TIMESTAMP,
    deleted_by_user_id BIGINT REFERENCES users (id) ON DELETE SET NULL,
    created_at         TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT ck_live_comments_content CHECK (char_length(content) > 0)
);

CREATE INDEX IF NOT EXISTS idx_live_comments_live_created
    ON live_comments (live_id, created_at DESC, id DESC);

CREATE INDEX IF NOT EXISTS idx_live_comments_user_created
    ON live_comments (user_id, created_at DESC);

-- One row per finished viewing session (written on leave, not on every presence event).
CREATE TABLE IF NOT EXISTS live_viewers (
    id                     BIGSERIAL PRIMARY KEY,
    live_id                BIGINT      NOT NULL REFERENCES lives (id) ON DELETE CASCADE,
    user_id                BIGINT REFERENCES users (id) ON DELETE SET NULL,
    session_id             VARCHAR(64) NOT NULL,
    joined_at              TIMESTAMP   NOT NULL,
    left_at                TIMESTAMP,
    watch_duration_seconds BIGINT      NOT NULL DEFAULT 0,
    CONSTRAINT ck_live_viewers_duration CHECK (watch_duration_seconds >= 0)
);

CREATE INDEX IF NOT EXISTS idx_live_viewers_live_joined
    ON live_viewers (live_id, joined_at);

CREATE INDEX IF NOT EXISTS idx_live_viewers_user_joined
    ON live_viewers (user_id, joined_at DESC);

-- Per-user like aggregate, flushed from Redis in batches (never one row per tap).
CREATE TABLE IF NOT EXISTS live_likes (
    id         BIGSERIAL PRIMARY KEY,
    live_id    BIGINT    NOT NULL REFERENCES lives (id) ON DELETE CASCADE,
    user_id    BIGINT    NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    like_count BIGINT    NOT NULL DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uk_live_likes_live_user UNIQUE (live_id, user_id),
    CONSTRAINT ck_live_likes_count CHECK (like_count >= 0)
);

CREATE INDEX IF NOT EXISTS idx_live_likes_live_count
    ON live_likes (live_id, like_count DESC);

-- Moderators are appointed per host and apply to every LIVE of that host.
CREATE TABLE IF NOT EXISTS live_moderators (
    id           BIGSERIAL PRIMARY KEY,
    host_id      BIGINT    NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    moderator_id BIGINT    NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    created_at   TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uk_live_moderators_pair UNIQUE (host_id, moderator_id),
    CONSTRAINT ck_live_moderators_not_self CHECK (host_id <> moderator_id)
);

CREATE INDEX IF NOT EXISTS idx_live_moderators_moderator
    ON live_moderators (moderator_id);

CREATE TABLE IF NOT EXISTS live_user_restrictions (
    id                 BIGSERIAL PRIMARY KEY,
    live_id            BIGINT      NOT NULL REFERENCES lives (id) ON DELETE CASCADE,
    user_id            BIGINT      NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    restriction_type   VARCHAR(8)  NOT NULL,
    reason             VARCHAR(300),
    expires_at         TIMESTAMP,
    created_by_user_id BIGINT REFERENCES users (id) ON DELETE SET NULL,
    created_at         TIMESTAMP   NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uk_live_user_restrictions UNIQUE (live_id, user_id, restriction_type),
    CONSTRAINT ck_live_user_restrictions_type CHECK (restriction_type IN ('MUTE', 'BAN'))
);

CREATE INDEX IF NOT EXISTS idx_live_user_restrictions_user
    ON live_user_restrictions (user_id, live_id);

CREATE TABLE IF NOT EXISTS live_reports (
    id          BIGSERIAL PRIMARY KEY,
    live_id     BIGINT      NOT NULL REFERENCES lives (id) ON DELETE CASCADE,
    comment_id  BIGINT REFERENCES live_comments (id) ON DELETE SET NULL,
    reporter_id BIGINT      NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    reason      VARCHAR(64) NOT NULL,
    details     VARCHAR(500),
    status      VARCHAR(16) NOT NULL DEFAULT 'OPEN',
    created_at  TIMESTAMP   NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT ck_live_reports_status CHECK (status IN ('OPEN', 'REVIEWED', 'DISMISSED'))
);

CREATE INDEX IF NOT EXISTS idx_live_reports_status_created
    ON live_reports (status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_live_reports_live
    ON live_reports (live_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_live_reports_reporter
    ON live_reports (reporter_id, live_id);
