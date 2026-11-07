-- Timed CC tracks (ASR source + lazy translated).

CREATE TABLE IF NOT EXISTS video_subtitle_tracks (
    id                BIGSERIAL PRIMARY KEY,
    video_id          BIGINT NOT NULL REFERENCES videos (id) ON DELETE CASCADE,
    lang              VARCHAR(16) NOT NULL,
    source            VARCHAR(20) NOT NULL DEFAULT 'asr',
    status            VARCHAR(20) NOT NULL DEFAULT 'READY',
    source_track_id   BIGINT REFERENCES video_subtitle_tracks (id) ON DELETE SET NULL,
    model             VARCHAR(128),
    cue_count         INT NOT NULL DEFAULT 0,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_video_subtitle_tracks_video_lang UNIQUE (video_id, lang),
    CONSTRAINT chk_video_subtitle_tracks_source CHECK (source IN ('asr', 'translated')),
    CONSTRAINT chk_video_subtitle_tracks_status CHECK (status IN ('READY', 'PENDING', 'FAILED'))
);

CREATE INDEX IF NOT EXISTS idx_video_subtitle_tracks_video
    ON video_subtitle_tracks (video_id);

CREATE TABLE IF NOT EXISTS video_subtitle_cues (
    id          BIGSERIAL PRIMARY KEY,
    track_id    BIGINT NOT NULL REFERENCES video_subtitle_tracks (id) ON DELETE CASCADE,
    start_ms    INT NOT NULL,
    end_ms      INT NOT NULL,
    text        TEXT NOT NULL,
    ordinal     INT NOT NULL DEFAULT 0,
    CONSTRAINT chk_video_subtitle_cues_range CHECK (end_ms >= start_ms)
);

CREATE INDEX IF NOT EXISTS idx_video_subtitle_cues_track_time
    ON video_subtitle_cues (track_id, start_ms, end_ms);
