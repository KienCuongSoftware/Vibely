-- COMMENT_REPLY: comment_id = bình luận gốc (anchor), không phải reply.
UPDATE user_notifications n
SET comment_id = c.parent_comment_id
FROM comments c
WHERE n.type = 'COMMENT_REPLY'
  AND n.comment_id = c.id
  AND c.parent_comment_id IS NOT NULL;

INSERT INTO user_notification_actors (notification_id, actor_id, created_at)
SELECT n.id, n.actor_id, n.created_at
FROM user_notifications n
WHERE n.type IN ('COMMENT_REPLY', 'COMMENT_LIKE')
  AND n.actor_id IS NOT NULL
  AND n.comment_id IS NOT NULL
ON CONFLICT DO NOTHING;

WITH grouped AS (
    SELECT
        recipient_id,
        comment_id,
        COUNT(*)::INT AS cnt,
        MAX(created_at) AS latest_created,
        (ARRAY_AGG(id ORDER BY created_at DESC, id DESC))[1] AS keep_id,
        (ARRAY_AGG(actor_id ORDER BY created_at DESC, id DESC))[1] AS latest_actor_id,
        (ARRAY_AGG(preview ORDER BY created_at DESC, id DESC))[1] AS latest_preview
    FROM user_notifications
    WHERE type = 'COMMENT_REPLY'
      AND comment_id IS NOT NULL
    GROUP BY recipient_id, comment_id
)
UPDATE user_notifications n
SET
    actor_count = g.cnt,
    actor_id = g.latest_actor_id,
    preview = g.latest_preview,
    updated_at = g.latest_created
FROM grouped g
WHERE n.id = g.keep_id;

DELETE FROM user_notifications n
WHERE n.type = 'COMMENT_REPLY'
  AND n.comment_id IS NOT NULL
  AND n.id NOT IN (
      SELECT g.keep_id
      FROM (
          SELECT
              (ARRAY_AGG(id ORDER BY created_at DESC, id DESC))[1] AS keep_id
          FROM user_notifications
          WHERE type = 'COMMENT_REPLY'
            AND comment_id IS NOT NULL
          GROUP BY recipient_id, comment_id
      ) g
  );

WITH grouped AS (
    SELECT
        recipient_id,
        comment_id,
        COUNT(*)::INT AS cnt,
        MAX(created_at) AS latest_created,
        (ARRAY_AGG(id ORDER BY created_at DESC, id DESC))[1] AS keep_id,
        (ARRAY_AGG(actor_id ORDER BY created_at DESC, id DESC))[1] AS latest_actor_id
    FROM user_notifications
    WHERE type = 'COMMENT_LIKE'
      AND comment_id IS NOT NULL
    GROUP BY recipient_id, comment_id
)
UPDATE user_notifications n
SET
    actor_count = g.cnt,
    actor_id = g.latest_actor_id,
    updated_at = g.latest_created
FROM grouped g
WHERE n.id = g.keep_id;

DELETE FROM user_notifications n
WHERE n.type = 'COMMENT_LIKE'
  AND n.comment_id IS NOT NULL
  AND n.id NOT IN (
      SELECT g.keep_id
      FROM (
          SELECT
              (ARRAY_AGG(id ORDER BY created_at DESC, id DESC))[1] AS keep_id
          FROM user_notifications
          WHERE type = 'COMMENT_LIKE'
            AND comment_id IS NOT NULL
          GROUP BY recipient_id, comment_id
      ) g
  );

DROP INDEX IF EXISTS uk_user_notifications_comment_like;

CREATE UNIQUE INDEX uk_user_notifications_comment_like_bucket
    ON user_notifications (recipient_id, comment_id)
    WHERE type = 'COMMENT_LIKE';

CREATE UNIQUE INDEX uk_user_notifications_comment_reply_bucket
    ON user_notifications (recipient_id, comment_id)
    WHERE type = 'COMMENT_REPLY';
