-- Backfill horror (Kinh dị) for existing ghost-story / horror videos so the Explore tab appears.
-- Requires V55 categories (slug = horror).

INSERT INTO video_categories (video_id, category_id, score, created_at)
SELECT DISTINCT v.id, c.id, 3.0, NOW()
FROM videos v
CROSS JOIN categories c
WHERE c.slug = 'horror'
  AND c.enabled = TRUE
  AND (
        EXISTS (
            SELECT 1
            FROM video_hashtags vh
            JOIN hashtags h ON h.id = vh.hashtag_id
            WHERE vh.video_id = v.id
              AND (
                    lower(h.tag) IN (
                        'horror', 'horrorstory', 'truyenma', 'creepypasta', 'creepy', 'scary',
                        'halloween', 'ghost', 'kinhdi', 'phimma', 'truecrime'
                    )
                    OR lower(h.tag) LIKE '%horror%'
                    OR lower(h.tag) LIKE '%truyenma%'
                    OR lower(h.tag) LIKE '%creepy%'
                    OR lower(h.tag) LIKE '%halloween%'
                    OR lower(h.tag) LIKE '%kinhdi%'
                    OR lower(h.tag) LIKE '%ghost%'
                )
        )
        OR lower(coalesce(v.title, '') || ' ' || coalesce(v.description, '')) LIKE '%horror%'
        OR lower(coalesce(v.title, '') || ' ' || coalesce(v.description, '')) LIKE '%halloween%'
        OR lower(coalesce(v.title, '') || ' ' || coalesce(v.description, '')) LIKE '%creepy%'
        OR lower(coalesce(v.title, '') || ' ' || coalesce(v.description, '')) LIKE '%creepypasta%'
        OR lower(coalesce(v.title, '') || ' ' || coalesce(v.description, '')) LIKE '%ghost%'
        OR lower(coalesce(v.title, '') || ' ' || coalesce(v.description, '')) LIKE '%truyen ma%'
        OR lower(coalesce(v.title, '') || ' ' || coalesce(v.description, '')) LIKE '%truyenma%'
        OR lower(coalesce(v.title, '') || ' ' || coalesce(v.description, '')) LIKE '%kinh di%'
        OR lower(coalesce(v.title, '') || ' ' || coalesce(v.description, '')) LIKE '%kinhdi%'
        OR lower(coalesce(v.title, '') || ' ' || coalesce(v.description, '')) LIKE '%phim ma%'
        OR coalesce(v.title, '') || ' ' || coalesce(v.description, '') ILIKE '%truyện ma%'
        OR coalesce(v.title, '') || ' ' || coalesce(v.description, '') ILIKE '%kinh dị%'
    )
ON CONFLICT (video_id, category_id) DO UPDATE
SET score = GREATEST(video_categories.score, EXCLUDED.score);
