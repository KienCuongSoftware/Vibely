-- Processing lifecycle: migrate legacy public videos to READY
UPDATE videos SET status = 'READY' WHERE status = 'ACTIVE';

ALTER TABLE videos ADD COLUMN master_playlist_url TEXT;
ALTER TABLE videos ADD COLUMN duration_seconds INTEGER;
ALTER TABLE videos ADD COLUMN processing_error TEXT;

CREATE TABLE video_processing_jobs (
    id BIGSERIAL PRIMARY KEY,
    video_id BIGINT NOT NULL UNIQUE REFERENCES videos(id) ON DELETE CASCADE,
    job_state VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    attempts INT NOT NULL DEFAULT 0,
    last_error TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_video_processing_jobs_pending ON video_processing_jobs (job_state, created_at);
