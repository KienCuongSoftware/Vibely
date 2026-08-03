-- AI Enhancement: versions, jobs, rules, outbox (independent of standard FFmpeg pipeline)

CREATE TABLE IF NOT EXISTS video_versions (
    id                  BIGSERIAL PRIMARY KEY,
    video_id            BIGINT NOT NULL REFERENCES videos (id) ON DELETE CASCADE,
    kind                VARCHAR(32) NOT NULL,
    profile             VARCHAR(64) NOT NULL,
    label               VARCHAR(120) NOT NULL,
    master_playlist_url TEXT,
    storage_prefix      TEXT,
    width_px            INT,
    height_px           INT,
    status              VARCHAR(32) NOT NULL DEFAULT 'ACTIVE',
    created_from_job_id UUID,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_video_versions_video_id ON video_versions (video_id);
CREATE INDEX IF NOT EXISTS idx_video_versions_kind ON video_versions (video_id, kind, status);

CREATE TABLE IF NOT EXISTS enhancement_rules (
    id              BIGSERIAL PRIMARY KEY,
    name            VARCHAR(120) NOT NULL,
    enabled         BOOLEAN NOT NULL DEFAULT TRUE,
    priority        INT NOT NULL DEFAULT 100,
    predicate_json  TEXT NOT NULL,
    action_json     TEXT NOT NULL,
    cooldown_hours  INT NOT NULL DEFAULT 24,
    created_by      BIGINT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS enhancement_jobs (
    id                  UUID PRIMARY KEY,
    video_id            BIGINT NOT NULL REFERENCES videos (id) ON DELETE CASCADE,
    target_profile      VARCHAR(64) NOT NULL,
    enhancement_level   VARCHAR(32) NOT NULL DEFAULT 'MEDIUM',
    trigger_reason      VARCHAR(64) NOT NULL,
    rule_id             BIGINT REFERENCES enhancement_rules (id) ON DELETE SET NULL,
    state               VARCHAR(32) NOT NULL,
    attempts            INT NOT NULL DEFAULT 0,
    max_attempts        INT NOT NULL DEFAULT 5,
    progress_pct        INT NOT NULL DEFAULT 0,
    progress_stage      VARCHAR(64),
    progress_detail     TEXT,
    lease_owner         VARCHAR(120),
    lease_until         TIMESTAMPTZ,
    input_s3_key        TEXT,
    staging_prefix      TEXT,
    output_version_id   BIGINT REFERENCES video_versions (id) ON DELETE SET NULL,
    model_name          VARCHAR(120),
    model_version       VARCHAR(120),
    checkpoint_json     TEXT,
    last_error          TEXT,
    error_code          VARCHAR(64),
    idempotency_key     VARCHAR(200) NOT NULL,
    queued_at           TIMESTAMPTZ,
    started_at          TIMESTAMPTZ,
    finished_at         TIMESTAMPTZ,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_enhancement_jobs_idempotency UNIQUE (idempotency_key)
);

CREATE INDEX IF NOT EXISTS idx_enhancement_jobs_state ON enhancement_jobs (state, created_at);
CREATE INDEX IF NOT EXISTS idx_enhancement_jobs_video ON enhancement_jobs (video_id, target_profile);
CREATE INDEX IF NOT EXISTS idx_enhancement_jobs_lease ON enhancement_jobs (state, lease_until);

CREATE TABLE IF NOT EXISTS enhancement_event_outbox (
    id              BIGSERIAL PRIMARY KEY,
    aggregate_type  VARCHAR(64) NOT NULL,
    aggregate_id    VARCHAR(64) NOT NULL,
    event_type      VARCHAR(120) NOT NULL,
    payload         TEXT NOT NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    published_at    TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_enhancement_outbox_unpublished
    ON enhancement_event_outbox (published_at, id)
    WHERE published_at IS NULL;

-- Default rule: admin-only path still works without matching; optional auto rule disabled by default
INSERT INTO enhancement_rules (name, enabled, priority, predicate_json, action_json, cooldown_hours)
SELECT
    'views-100k-native-enhance',
    FALSE,
    100,
    '{"all":[{"metric":"views","op":">=","value":100000}]}',
    '{"enqueue_profiles":["ENHANCE_NATIVE"],"level":"MEDIUM","max_upscale_factor":2}',
    72
WHERE NOT EXISTS (
    SELECT 1 FROM enhancement_rules WHERE name = 'views-100k-native-enhance'
);
