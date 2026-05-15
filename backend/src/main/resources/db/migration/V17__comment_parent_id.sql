ALTER TABLE comments
    ADD COLUMN parent_comment_id BIGINT REFERENCES comments (id) ON DELETE CASCADE;

CREATE INDEX idx_comments_video_parent ON comments (video_id, parent_comment_id);
