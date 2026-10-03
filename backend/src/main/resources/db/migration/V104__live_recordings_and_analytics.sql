-- LIVE (phase 4): recording -> replay and post-LIVE analytics.
-- Recording files are written by SRS (DVR) to local disk, then remuxed and uploaded by a background
-- worker; the replay itself is a regular (draft, host-only) video that goes through the existing
-- video pipeline. No media is stored in the database: only state, object keys and counters.

ALTER TABLE lives
    ADD COLUMN IF NOT EXISTS recording_enabled BOOLEAN NOT NULL DEFAULT FALSE;

CREATE TABLE IF NOT EXISTS live_recordings (
    id                    BIGSERIAL PRIMARY KEY,
    live_id               BIGINT       NOT NULL REFERENCES lives (id) ON DELETE CASCADE,
    host_id               BIGINT       NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    status                VARCHAR(16)  NOT NULL DEFAULT 'RECORDING',
    video_id              BIGINT REFERENCES videos (id) ON DELETE SET NULL,
    storage_key           VARCHAR(512),
    duration_seconds      INT,
    size_bytes            BIGINT,
    attempts              INT          NOT NULL DEFAULT 0,
    failure_reason        VARCHAR(64),
    started_at            TIMESTAMP    NOT NULL,
    live_ended_at         TIMESTAMP,
    processing_started_at TIMESTAMP,
    ready_at              TIMESTAMP,
    created_at            TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at            TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uk_live_recordings_live UNIQUE (live_id),
    CONSTRAINT ck_live_recordings_status CHECK (status IN ('RECORDING', 'PROCESSING', 'READY', 'FAILED', 'DELETED')),
    CONSTRAINT ck_live_recordings_attempts CHECK (attempts >= 0)
);

-- The worker scans unfinished recordings by state only.
CREATE INDEX IF NOT EXISTS idx_live_recordings_status
    ON live_recordings (status)
    WHERE status IN ('RECORDING', 'PROCESSING');

CREATE INDEX IF NOT EXISTS idx_live_recordings_host
    ON live_recordings (host_id, created_at DESC);

-- One row per DVR file reported by SRS (on_dvr). A LIVE with reconnects has several files.
CREATE TABLE IF NOT EXISTS live_recording_segments (
    id           BIGSERIAL PRIMARY KEY,
    recording_id BIGINT        NOT NULL REFERENCES live_recordings (id) ON DELETE CASCADE,
    file_path    VARCHAR(1024) NOT NULL,
    size_bytes   BIGINT        NOT NULL DEFAULT 0,
    created_at   TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uk_live_recording_segments_path UNIQUE (file_path)
);

CREATE INDEX IF NOT EXISTS idx_live_recording_segments_recording
    ON live_recording_segments (recording_id, id);

-- Final statistics computed once when a LIVE ends (idempotent: one row per LIVE).
CREATE TABLE IF NOT EXISTS live_analytics (
    live_id               BIGINT           PRIMARY KEY REFERENCES lives (id) ON DELETE CASCADE,
    duration_seconds      BIGINT           NOT NULL DEFAULT 0,
    unique_viewers        BIGINT           NOT NULL DEFAULT 0,
    total_watch_seconds   BIGINT           NOT NULL DEFAULT 0,
    average_watch_seconds BIGINT           NOT NULL DEFAULT 0,
    average_viewers       DOUBLE PRECISION NOT NULL DEFAULT 0,
    peak_viewers          BIGINT           NOT NULL DEFAULT 0,
    like_count            BIGINT           NOT NULL DEFAULT 0,
    comment_count         BIGINT           NOT NULL DEFAULT 0,
    reconnect_count       INT              NOT NULL DEFAULT 0,
    end_reason            VARCHAR(32),
    created_at            TIMESTAMP        NOT NULL DEFAULT CURRENT_TIMESTAMP
);
