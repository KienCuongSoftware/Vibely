CREATE TABLE comment_likes (
    id         BIGSERIAL PRIMARY KEY,
    user_id    BIGINT      NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    comment_id BIGINT      NOT NULL REFERENCES comments (id) ON DELETE CASCADE,
    created_at TIMESTAMP   NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uk_comment_likes_user_comment UNIQUE (user_id, comment_id)
);

CREATE INDEX idx_comment_likes_comment_id ON comment_likes (comment_id);
