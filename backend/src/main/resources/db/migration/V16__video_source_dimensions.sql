ALTER TABLE videos
    ADD COLUMN IF NOT EXISTS source_width_px INTEGER,
    ADD COLUMN IF NOT EXISTS source_height_px INTEGER;

COMMENT ON COLUMN videos.source_width_px IS 'Kích thước chiều ngang file gốc (ffprobe, đã xử lý rotate metadata nếu có)';
COMMENT ON COLUMN videos.source_height_px IS 'Kích thước chiều dọc file gốc (ffprobe, đã xử lý rotate metadata nếu có)';
