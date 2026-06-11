ALTER TABLE user_notifications
    ADD COLUMN actor_count INT NOT NULL DEFAULT 1,
    ADD COLUMN updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP;

UPDATE user_notifications
SET updated_at = created_at;

CREATE TABLE user_notification_actors (
    notification_id BIGINT NOT NULL REFERENCES user_notifications (id) ON DELETE CASCADE,
    actor_id        BIGINT NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    created_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (notification_id, actor_id)
);

CREATE INDEX idx_user_notification_actors_actor
    ON user_notification_actors (actor_id);

INSERT INTO user_notification_actors (notification_id, actor_id, created_at)
SELECT n.id, n.actor_id, n.created_at
FROM user_notifications n
WHERE n.type = 'VIDEO_LIKE'
  AND n.comment_id IS NULL
  AND n.actor_id IS NOT NULL;

WITH grouped AS (
    SELECT
        recipient_id,
        video_id,
        COUNT(*)::INT AS cnt,
        MAX(created_at) AS latest_created,
        (ARRAY_AGG(id ORDER BY created_at DESC, id DESC))[1] AS keep_id,
        (ARRAY_AGG(actor_id ORDER BY created_at DESC, id DESC))[1] AS latest_actor_id
    FROM user_notifications
    WHERE type = 'VIDEO_LIKE'
      AND comment_id IS NULL
      AND video_id IS NOT NULL
    GROUP BY recipient_id, video_id
)
UPDATE user_notifications n
SET
    actor_count = g.cnt,
    actor_id = g.latest_actor_id,
    updated_at = g.latest_created
FROM grouped g
WHERE n.id = g.keep_id;

DELETE FROM user_notifications n
WHERE n.type = 'VIDEO_LIKE'
  AND n.comment_id IS NULL
  AND n.video_id IS NOT NULL
  AND n.id NOT IN (
      SELECT g.keep_id
      FROM (
          SELECT
              (ARRAY_AGG(id ORDER BY created_at DESC, id DESC))[1] AS keep_id
          FROM user_notifications
          WHERE type = 'VIDEO_LIKE'
            AND comment_id IS NULL
            AND video_id IS NOT NULL
          GROUP BY recipient_id, video_id
      ) g
  );

DROP INDEX IF EXISTS uk_user_notifications_video_like;

CREATE UNIQUE INDEX uk_user_notifications_video_like_bucket
    ON user_notifications (recipient_id, video_id)
    WHERE type = 'VIDEO_LIKE' AND comment_id IS NULL;

CREATE INDEX idx_user_notifications_recipient_updated
    ON user_notifications (recipient_id, updated_at DESC, id DESC);
