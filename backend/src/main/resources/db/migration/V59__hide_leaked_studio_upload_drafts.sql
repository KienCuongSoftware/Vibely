-- Hide unfinished Studio uploads that leaked into post lists before reliable draft marking.
-- Only RAW/PROCESSING leftovers (never published intentionally for feed) created recently.
UPDATE videos
SET studio_draft = TRUE
WHERE studio_draft = FALSE
  AND status IN ('RAW', 'PROCESSING', 'FAILED')
  AND created_at > NOW() - INTERVAL '7 days'
  AND (
    title ILIKE 'snaptik%'
    OR title ILIKE 'ssstik%'
    OR title ILIKE 'tikmate%'
    OR description ILIKE 'snaptik%'
  );
