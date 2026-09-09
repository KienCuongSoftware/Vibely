-- Run on local Postgres (vibely), not production, while reproducing a slow feed.
-- Mirrors VideoRepository.findReadyFeedFirstPage (READY + public + not held).

EXPLAIN (ANALYZE, BUFFERS)
SELECT v.id
FROM videos v
WHERE v.status = 'READY'
  AND v.studio_draft = false
  AND (v.scheduled_at IS NULL OR v.scheduled_at <= NOW())
  AND v.privacy = 'PUBLIC'
  AND v.intended_privacy IS NULL
  AND NOT EXISTS (
      SELECT 1
      FROM moderation_decisions d
      WHERE d.video_id = v.id
        AND (d.review_required = true OR d.explore_eligible = false)
  )
ORDER BY v.created_at DESC, v.id DESC
LIMIT 20;

-- Look for: Seq Scan + high execution time → index / filter.
-- Index Scan + few ms → this query is probably not the 800ms p99.
