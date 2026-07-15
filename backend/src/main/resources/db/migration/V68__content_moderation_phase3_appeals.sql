-- Content Moderation Phase 3: appeals + trust audit completeness

CREATE TABLE IF NOT EXISTS moderation_appeals (
    id                BIGSERIAL PRIMARY KEY,
    video_id          BIGINT NOT NULL REFERENCES videos (id) ON DELETE CASCADE,
    author_user_id    BIGINT NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    report_id         BIGINT REFERENCES moderation_reports (id) ON DELETE SET NULL,
    decision_id       BIGINT REFERENCES moderation_decisions (id) ON DELETE SET NULL,
    from_decision     VARCHAR(16) NOT NULL,
    appeal_text       TEXT NOT NULL,
    appeal_state      VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    queue_id          BIGINT REFERENCES moderation_review_queue (id) ON DELETE SET NULL,
    resolved_decision VARCHAR(16),
    resolver_user_id  BIGINT REFERENCES users (id) ON DELETE SET NULL,
    resolver_notes    TEXT,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    resolved_at       TIMESTAMPTZ,
    CONSTRAINT moderation_appeals_from_chk CHECK (
        from_decision IN ('ALLOW', 'LIMIT', 'REVIEW', 'BLOCK', 'DELETE')
    ),
    CONSTRAINT moderation_appeals_state_chk CHECK (
        appeal_state IN ('PENDING', 'IN_REVIEW', 'UPHELD', 'SOFTENED', 'RESTORED', 'REJECTED')
    ),
    CONSTRAINT moderation_appeals_resolved_chk CHECK (
        resolved_decision IS NULL OR resolved_decision IN ('ALLOW', 'LIMIT', 'REVIEW', 'BLOCK', 'DELETE')
    )
);

CREATE INDEX IF NOT EXISTS idx_moderation_appeals_state
    ON moderation_appeals (appeal_state, created_at ASC);

CREATE INDEX IF NOT EXISTS idx_moderation_appeals_video
    ON moderation_appeals (video_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_moderation_appeals_author
    ON moderation_appeals (author_user_id, created_at DESC);

-- At most one open appeal per video
CREATE UNIQUE INDEX IF NOT EXISTS idx_moderation_appeals_one_open
    ON moderation_appeals (video_id)
    WHERE appeal_state IN ('PENDING', 'IN_REVIEW');

COMMENT ON TABLE moderation_appeals IS 'Phase 3 author appeals against moderation decisions';
