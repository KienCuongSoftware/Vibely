INSERT INTO user_notification_actors (notification_id, actor_id, created_at)
SELECT n.id, n.actor_id, n.created_at
FROM user_notifications n
WHERE n.type IN ('FOLLOW', 'MENTION')
  AND n.actor_id IS NOT NULL
ON CONFLICT DO NOTHING;

WITH grouped AS (
    SELECT
        recipient_id,
        COUNT(*)::INT AS cnt,
        MAX(created_at) AS latest_created,
        (ARRAY_AGG(id ORDER BY created_at DESC, id DESC))[1] AS keep_id,
        (ARRAY_AGG(actor_id ORDER BY created_at DESC, id DESC))[1] AS latest_actor_id
    FROM user_notifications
    WHERE type = 'FOLLOW'
    GROUP BY recipient_id
)
UPDATE user_notifications n
SET
    actor_count = g.cnt,
    actor_id = g.latest_actor_id,
    updated_at = g.latest_created
FROM grouped g
WHERE n.id = g.keep_id;

DELETE FROM user_notifications n
WHERE n.type = 'FOLLOW'
  AND n.id NOT IN (
      SELECT g.keep_id
      FROM (
          SELECT
              (ARRAY_AGG(id ORDER BY created_at DESC, id DESC))[1] AS keep_id
          FROM user_notifications
          WHERE type = 'FOLLOW'
          GROUP BY recipient_id
      ) g
  );

WITH grouped AS (
    SELECT
        recipient_id,
        video_id,
        COUNT(*)::INT AS cnt,
        MAX(created_at) AS latest_created,
        (ARRAY_AGG(id ORDER BY created_at DESC, id DESC))[1] AS keep_id,
        (ARRAY_AGG(actor_id ORDER BY created_at DESC, id DESC))[1] AS latest_actor_id,
        (ARRAY_AGG(comment_id ORDER BY created_at DESC, id DESC))[1] AS latest_comment_id,
        (ARRAY_AGG(preview ORDER BY created_at DESC, id DESC))[1] AS latest_preview
    FROM user_notifications
    WHERE type = 'MENTION'
      AND video_id IS NOT NULL
    GROUP BY recipient_id, video_id
)
UPDATE user_notifications n
SET
    actor_count = g.cnt,
    actor_id = g.latest_actor_id,
    comment_id = g.latest_comment_id,
    preview = g.latest_preview,
    updated_at = g.latest_created
FROM grouped g
WHERE n.id = g.keep_id;

DELETE FROM user_notifications n
WHERE n.type = 'MENTION'
  AND n.video_id IS NOT NULL
  AND n.id NOT IN (
      SELECT g.keep_id
      FROM (
          SELECT
              (ARRAY_AGG(id ORDER BY created_at DESC, id DESC))[1] AS keep_id
          FROM user_notifications
          WHERE type = 'MENTION'
            AND video_id IS NOT NULL
          GROUP BY recipient_id, video_id
      ) g
  );

DROP INDEX IF EXISTS uk_user_notifications_follow;

CREATE UNIQUE INDEX uk_user_notifications_follow_bucket
    ON user_notifications (recipient_id)
    WHERE type = 'FOLLOW';

CREATE UNIQUE INDEX uk_user_notifications_mention_bucket
    ON user_notifications (recipient_id, video_id)
    WHERE type = 'MENTION';
