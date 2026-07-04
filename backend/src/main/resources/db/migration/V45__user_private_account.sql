ALTER TABLE users
    ADD COLUMN private_account BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE follows
    ADD COLUMN status VARCHAR(20) NOT NULL DEFAULT 'ACCEPTED';

UPDATE follows
SET status = 'ACCEPTED'
WHERE status IS NULL OR status = '';

CREATE INDEX idx_follows_following_status ON follows (following_id, status);

ALTER TABLE user_notifications DROP CONSTRAINT IF EXISTS chk_user_notifications_type;

ALTER TABLE user_notifications ADD CONSTRAINT chk_user_notifications_type CHECK (
    type IN ('FOLLOW', 'FOLLOW_REQUEST', 'VIDEO_LIKE', 'COMMENT_LIKE', 'COMMENT_REPLY', 'MENTION')
);
