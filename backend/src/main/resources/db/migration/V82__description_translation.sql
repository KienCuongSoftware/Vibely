-- Description translation: detect-once lang + durable cache + CPU job queue.

ALTER TABLE videos
    ADD COLUMN IF NOT EXISTS description_lang VARCHAR(16);

CREATE TABLE IF NOT EXISTS description_translations (
    id              BIGSERIAL PRIMARY KEY,
    video_id        BIGINT NOT NULL REFERENCES videos (id) ON DELETE CASCADE,
    source_hash     VARCHAR(64) NOT NULL,
    source_lang     VARCHAR(16) NOT NULL,
    target_lang     VARCHAR(16) NOT NULL,
    translated_text TEXT NOT NULL,
    model           VARCHAR(128) NOT NULL DEFAULT 'unknown',
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_description_translations_video_hash_target
        UNIQUE (video_id, source_hash, target_lang)
);

CREATE INDEX IF NOT EXISTS idx_description_translations_video
    ON description_translations (video_id);

CREATE TABLE IF NOT EXISTS translation_jobs (
    id              BIGSERIAL PRIMARY KEY,
    video_id        BIGINT NOT NULL REFERENCES videos (id) ON DELETE CASCADE,
    source_hash     VARCHAR(64) NOT NULL,
    source_lang     VARCHAR(16),
    target_lang     VARCHAR(16) NOT NULL,
    source_text     TEXT NOT NULL,
    job_state       VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    attempts        INT NOT NULL DEFAULT 0,
    last_error      TEXT,
    claimed_at      TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_translation_jobs_active
        UNIQUE (video_id, source_hash, target_lang)
);

CREATE INDEX IF NOT EXISTS idx_translation_jobs_state_created
    ON translation_jobs (job_state, created_at);
