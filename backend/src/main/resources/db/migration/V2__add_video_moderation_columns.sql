ALTER TABLE videos
    ADD COLUMN status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
    ADD COLUMN report_reason VARCHAR(500),
    ADD COLUMN reported_at TIMESTAMP;

CREATE INDEX idx_videos_status_created_at ON videos(status, created_at DESC);
