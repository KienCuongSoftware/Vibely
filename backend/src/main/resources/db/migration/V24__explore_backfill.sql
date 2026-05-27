-- Backfill default category for historical READY videos.
INSERT INTO video_categories(video_id, category_id, score, created_at)
SELECT v.id, c.id, 1.0, CURRENT_TIMESTAMP
FROM videos v
JOIN categories c ON c.slug = 'all'
LEFT JOIN video_categories vc ON vc.video_id = v.id AND vc.category_id = c.id
WHERE v.status = 'READY' AND vc.video_id IS NULL;

-- Extract hashtags from historical title + description.
WITH extracted AS (
    SELECT
        v.id AS video_id,
        lower(regexp_replace(m[1], '[^a-z0-9_]', '', 'g')) AS tag
    FROM videos v,
         regexp_matches(coalesce(v.title, '') || ' ' || coalesce(v.description, ''), '#([[:alnum:]_]{2,80})', 'gi') AS m
)
INSERT INTO hashtags(tag, created_at)
SELECT DISTINCT e.tag, CURRENT_TIMESTAMP
FROM extracted e
WHERE e.tag IS NOT NULL AND e.tag <> ''
ON CONFLICT (tag) DO NOTHING;

INSERT INTO video_hashtags(video_id, hashtag_id, created_at)
SELECT DISTINCT e.video_id, h.id, CURRENT_TIMESTAMP
FROM (
    SELECT
        v.id AS video_id,
        lower(regexp_replace(m[1], '[^a-z0-9_]', '', 'g')) AS tag
    FROM videos v,
         regexp_matches(coalesce(v.title, '') || ' ' || coalesce(v.description, ''), '#([[:alnum:]_]{2,80})', 'gi') AS m
) e
JOIN hashtags h ON h.tag = e.tag
ON CONFLICT (video_id, hashtag_id) DO NOTHING;

-- Approximate initial explore_score for historical videos.
UPDATE videos v
SET explore_score = (
    (coalesce((SELECT count(*) FROM likes l WHERE l.video_id = v.id), 0) * 3) +
    (coalesce((SELECT count(*) FROM comments c WHERE c.video_id = v.id), 0) * 5) +
    (coalesce(v.share_count, 0) * 8) +
    (coalesce((SELECT count(*) FROM video_views vv WHERE vv.video_id = v.id), 0) * 0.05)
),
explore_score_updated_at = CURRENT_TIMESTAMP
WHERE v.status = 'READY';
