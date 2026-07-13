-- Originality / near-duplicate detection jobs and reports.

CREATE TABLE originality_jobs (
    id              BIGSERIAL PRIMARY KEY,
    video_id        BIGINT NOT NULL UNIQUE REFERENCES videos (id) ON DELETE CASCADE,
    job_state       VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    attempts        INT NOT NULL DEFAULT 0,
    policy_version  VARCHAR(32) NOT NULL DEFAULT 'v1',
    last_error      TEXT,
    claimed_at      TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT originality_jobs_state_chk CHECK (
        job_state IN ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED')
    )
);

CREATE INDEX idx_originality_jobs_pending
    ON originality_jobs (created_at ASC)
    WHERE job_state = 'PENDING';

CREATE INDEX idx_originality_jobs_processing
    ON originality_jobs (claimed_at ASC)
    WHERE job_state = 'PROCESSING';

CREATE TABLE originality_reports (
    id                   BIGSERIAL PRIMARY KEY,
    video_id             BIGINT NOT NULL UNIQUE REFERENCES videos (id) ON DELETE CASCADE,
    job_id               BIGINT REFERENCES originality_jobs (id) ON DELETE SET NULL,
    policy_version       VARCHAR(32) NOT NULL DEFAULT 'v1',
    originality_score    DOUBLE PRECISION NOT NULL,
    visual_similarity    DOUBLE PRECISION NOT NULL DEFAULT 0,
    audio_similarity     DOUBLE PRECISION NOT NULL DEFAULT 0,
    ocr_similarity       DOUBLE PRECISION NOT NULL DEFAULT 0,
    watermark_score      DOUBLE PRECISION NOT NULL DEFAULT 0,
    metadata_score       DOUBLE PRECISION NOT NULL DEFAULT 0,
    scene_object_score   DOUBLE PRECISION NOT NULL DEFAULT 0,
    overall_confidence   DOUBLE PRECISION NOT NULL DEFAULT 0,
    risk_level           VARCHAR(16) NOT NULL,
    decision             VARCHAR(32) NOT NULL,
    matched_video_id     BIGINT REFERENCES videos (id) ON DELETE SET NULL,
    explain_json         JSONB NOT NULL DEFAULT '{}'::jsonb,
    model_versions       JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT originality_reports_risk_chk CHECK (
        risk_level IN ('LOW', 'MEDIUM', 'HIGH')
    ),
    CONSTRAINT originality_reports_decision_chk CHECK (
        decision IN ('ALLOW', 'REVIEW', 'LIMIT_DISTRIBUTION', 'BLOCK')
    )
);

CREATE INDEX idx_originality_reports_decision ON originality_reports (decision);
CREATE INDEX idx_originality_reports_matched ON originality_reports (matched_video_id)
    WHERE matched_video_id IS NOT NULL;

CREATE TABLE originality_matches (
    id                BIGSERIAL PRIMARY KEY,
    report_id         BIGINT NOT NULL REFERENCES originality_reports (id) ON DELETE CASCADE,
    matched_video_id  BIGINT NOT NULL REFERENCES videos (id) ON DELETE CASCADE,
    modality          VARCHAR(24) NOT NULL,
    score             DOUBLE PRECISION NOT NULL,
    detail_json       JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT originality_matches_modality_chk CHECK (
        modality IN ('VISUAL', 'AUDIO', 'OCR', 'WATERMARK', 'METADATA', 'SCENE')
    )
);

CREATE INDEX idx_originality_matches_report ON originality_matches (report_id);
