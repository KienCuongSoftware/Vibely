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
                    OR lower(h.tag) LIKE '%bocau%'
                )
        )
        OR lower(coalesce(v.title, '') || ' ' || coalesce(v.description, '')) LIKE ANY (ARRAY[
            '%horror%',
            '%halloween%',
            '%creepy%',
            '%creepypasta%',
            '%ghost%',
            '%truyện ma%',
            '%truyen ma%',
            '%truyenma%',
            '%kinh dị%',
            '%kinh di%',
            '%kinhdi%',
            '%phim ma%',
        ])
    )
ON CONFLICT (video_id, category_id) DO UPDATE
SET score = GREATEST(video_categories.score, EXCLUDED.score);
