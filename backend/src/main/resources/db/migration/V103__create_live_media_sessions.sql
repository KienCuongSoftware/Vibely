-- LIVE (phase 3): one media session per broadcast. Media itself flows browser <-> SRS; this table only
-- holds the control-plane state used to authorize SRS hooks and to detect a vanished publisher.
-- The publish credential is stored as a SHA-256 hash and is single-use.

CREATE TABLE IF NOT EXISTS live_media_sessions (
    id                       BIGSERIAL PRIMARY KEY,
    live_id                  BIGINT      NOT NULL REFERENCES lives (id) ON DELETE CASCADE,
    stream_name              VARCHAR(64) NOT NULL,
    status                   VARCHAR(16) NOT NULL DEFAULT 'PENDING',
    publish_token_hash       VARCHAR(64),
    publish_token_expires_at TIMESTAMP,
    publisher_client_id      VARCHAR(64),
    last_published_at        TIMESTAMP,
    disconnected_at          TIMESTAMP,
    publish_count            INT         NOT NULL DEFAULT 0,
    cleanup_pending          BOOLEAN     NOT NULL DEFAULT FALSE,
    created_at               TIMESTAMP   NOT NULL DEFAULT CURRENT_TIMESTAMP,
    ended_at                 TIMESTAMP,
    CONSTRAINT uk_live_media_sessions_live UNIQUE (live_id),
    CONSTRAINT uk_live_media_sessions_stream UNIQUE (stream_name),
    CONSTRAINT ck_live_media_sessions_status CHECK (status IN ('PENDING', 'PUBLISHING', 'INTERRUPTED', 'ENDED')),
    CONSTRAINT ck_live_media_sessions_ended CHECK (status <> 'ENDED' OR ended_at IS NOT NULL)
);

-- Health checks scan open sessions by state; ended sessions are only revisited while cleanup is pending.
CREATE INDEX IF NOT EXISTS idx_live_media_sessions_status
    ON live_media_sessions (status);

CREATE INDEX IF NOT EXISTS idx_live_media_sessions_cleanup
    ON live_media_sessions (cleanup_pending) WHERE cleanup_pending = TRUE;
