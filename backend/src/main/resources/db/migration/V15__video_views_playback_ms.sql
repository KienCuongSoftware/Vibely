-- Thời lượng phát gửi từ client (để thống kê Studio: TB, tổng, retention).
ALTER TABLE video_views ADD COLUMN watched_ms BIGINT;
ALTER TABLE video_views ADD COLUMN duration_ms BIGINT;
