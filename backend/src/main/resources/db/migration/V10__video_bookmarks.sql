CREATE TABLE video_bookmarks (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    video_id BIGINT NOT NULL REFERENCES videos(id) ON DELETE CASCADE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uk_video_bookmarks_user_video UNIQUE (user_id, video_id)
);

CREATE INDEX idx_video_bookmarks_user_id ON video_bookmarks(user_id);
