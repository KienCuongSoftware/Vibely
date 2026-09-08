-- Nguồn phát hiện video (For You / hồ sơ / tìm kiếm / khác) để Studio Analytics.
ALTER TABLE video_views ADD COLUMN IF NOT EXISTS traffic_source VARCHAR(16);
ALTER TABLE video_views ADD COLUMN IF NOT EXISTS search_query VARCHAR(80);

UPDATE video_views
SET traffic_source = 'other'
WHERE traffic_source IS NULL;

COMMENT ON COLUMN video_views.traffic_source IS
    'Allowlisted discovery surface: foryou, profile, search, other.';
COMMENT ON COLUMN video_views.search_query IS
    'Sanitized search/hashtag query when traffic_source = search.';
