CREATE TABLE video_reposts (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    video_id BIGINT NOT NULL REFERENCES videos(id) ON DELETE CASCADE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uk_video_reposts_user_video UNIQUE (user_id, video_id)
);

CREATE INDEX idx_video_reposts_user_id ON video_reposts(user_id);
