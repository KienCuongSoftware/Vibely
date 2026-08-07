-- Profile page visit events for Studio "Lượt xem hồ sơ"
CREATE TABLE IF NOT EXISTS profile_views (
    id              BIGSERIAL PRIMARY KEY,
    profile_user_id BIGINT NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    viewer_user_id  BIGINT NULL REFERENCES users (id) ON DELETE SET NULL,
    viewer_key      VARCHAR(64) NOT NULL,
    created_at      TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_profile_views_profile_created
    ON profile_views (profile_user_id, created_at);

CREATE INDEX IF NOT EXISTS idx_profile_views_dedupe
    ON profile_views (profile_user_id, viewer_key, created_at);
