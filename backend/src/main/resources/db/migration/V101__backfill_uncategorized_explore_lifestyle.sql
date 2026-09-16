-- Assign Explore-visible lifestyle category to READY public videos with no strong category link.
INSERT INTO video_categories (video_id, category_id, score, created_at)
SELECT v.id, c.id, 1.5, NOW()
FROM videos v
CROSS JOIN categories c
WHERE c.slug = 'lifestyle'
  AND c.enabled = true
  AND v.status = 'READY'
  AND COALESCE(v.privacy, 'PUBLIC') = 'PUBLIC'
  AND COALESCE(v.studio_draft, false) = false
  AND NOT EXISTS (
      SELECT 1
      FROM video_categories vc
      WHERE vc.video_id = v.id
        AND vc.score >= 1.5
  )
ON CONFLICT (video_id, category_id) DO UPDATE
SET score = GREATEST(video_categories.score, EXCLUDED.score);
