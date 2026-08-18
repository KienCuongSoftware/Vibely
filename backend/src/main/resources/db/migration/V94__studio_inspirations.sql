CREATE TABLE IF NOT EXISTS studio_inspirations (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    video_id BIGINT NOT NULL REFERENCES videos (id) ON DELETE CASCADE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uk_studio_inspirations_user_video UNIQUE (user_id, video_id)
);

CREATE INDEX IF NOT EXISTS idx_studio_inspirations_user_created
    ON studio_inspirations (user_id, created_at DESC);

COMMENT ON TABLE studio_inspirations IS
    'Videos a creator saved to Studio → Cảm hứng của tôi.';
