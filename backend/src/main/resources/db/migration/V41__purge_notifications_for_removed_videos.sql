-- Video soft-delete (status REMOVED) does not fire FK CASCADE — clean stale activity rows.
DELETE FROM user_notifications n
WHERE n.video_id IN (SELECT id FROM videos WHERE status = 'REMOVED');

DELETE FROM user_notifications n
WHERE n.comment_id IN (
    SELECT c.id
    FROM comments c
    INNER JOIN videos v ON v.id = c.video_id
    WHERE v.status = 'REMOVED'
);
