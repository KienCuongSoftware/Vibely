-- Content Understanding System — Phase 1
-- Semantic tags as source of truth; categories projected via mapping.
-- Jobs + transactional outbox + RabbitMQ-ready event envelope.

CREATE TABLE IF NOT EXISTS semantic_tags (
    id           BIGSERIAL PRIMARY KEY,
    slug         VARCHAR(64) NOT NULL,
    name         VARCHAR(128) NOT NULL,
    description  TEXT,
    language     VARCHAR(8) NOT NULL DEFAULT 'und',
    parent_id    BIGINT REFERENCES semantic_tags (id) ON DELETE SET NULL,
    status       VARCHAR(16) NOT NULL DEFAULT 'active',
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT semantic_tags_slug_uq UNIQUE (slug),
    CONSTRAINT semantic_tags_status_chk CHECK (status IN ('active', 'deprecated'))
);

CREATE INDEX IF NOT EXISTS idx_semantic_tags_status ON semantic_tags (status);
CREATE INDEX IF NOT EXISTS idx_semantic_tags_parent ON semantic_tags (parent_id);

CREATE TABLE IF NOT EXISTS semantic_tag_aliases (
    id         BIGSERIAL PRIMARY KEY,
    tag_id     BIGINT NOT NULL REFERENCES semantic_tags (id) ON DELETE CASCADE,
    alias      VARCHAR(128) NOT NULL,
    language   VARCHAR(8) NOT NULL DEFAULT 'und',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT semantic_tag_aliases_uq UNIQUE (alias, language)
);

CREATE INDEX IF NOT EXISTS idx_semantic_tag_aliases_tag ON semantic_tag_aliases (tag_id);

CREATE TABLE IF NOT EXISTS video_semantic_tags (
    video_id      BIGINT NOT NULL REFERENCES videos (id) ON DELETE CASCADE,
    tag_id        BIGINT NOT NULL REFERENCES semantic_tags (id) ON DELETE CASCADE,
    confidence    REAL NOT NULL,
    source        VARCHAR(32) NOT NULL,
    model_version VARCHAR(64) NOT NULL,
    reason        TEXT NOT NULL,
    evidence      JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (video_id, tag_id),
    CONSTRAINT video_semantic_tags_conf_chk CHECK (confidence >= 0 AND confidence <= 1)
);

CREATE INDEX IF NOT EXISTS idx_video_semantic_tags_tag_conf
    ON video_semantic_tags (tag_id, confidence DESC);
CREATE INDEX IF NOT EXISTS idx_video_semantic_tags_source
    ON video_semantic_tags (source);

CREATE TABLE IF NOT EXISTS category_tag_mapping (
    id                  BIGSERIAL PRIMARY KEY,
    category_id         BIGINT NOT NULL REFERENCES categories (id) ON DELETE CASCADE,
    tag_id              BIGINT NOT NULL REFERENCES semantic_tags (id) ON DELETE CASCADE,
    weight              REAL NOT NULL DEFAULT 1.0,
    priority            INT NOT NULL DEFAULT 100,
    rule                VARCHAR(32) NOT NULL DEFAULT 'weighted_sum',
    min_tag_confidence  REAL NOT NULL DEFAULT 0.40,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT category_tag_mapping_uq UNIQUE (category_id, tag_id)
);

CREATE INDEX IF NOT EXISTS idx_category_tag_mapping_tag ON category_tag_mapping (tag_id);

CREATE TABLE IF NOT EXISTS content_features (
    video_id         BIGINT PRIMARY KEY REFERENCES videos (id) ON DELETE CASCADE,
    content_sha256   CHAR(64),
    feature_version  VARCHAR(64) NOT NULL DEFAULT 'cu-phase1',
    visual           JSONB NOT NULL DEFAULT '{}'::jsonb,
    ocr              JSONB NOT NULL DEFAULT '{}'::jsonb,
    speech           JSONB NOT NULL DEFAULT '{}'::jsonb,
    scene            JSONB NOT NULL DEFAULT '{}'::jsonb,
    object_features  JSONB NOT NULL DEFAULT '{}'::jsonb,
    metadata         JSONB NOT NULL DEFAULT '{}'::jsonb,
    emotion          JSONB NOT NULL DEFAULT '{}'::jsonb,
    audio            JSONB NOT NULL DEFAULT '{}'::jsonb,
    expires_at       TIMESTAMPTZ,
    updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_content_features_sha
    ON content_features (content_sha256)
    WHERE content_sha256 IS NOT NULL;

CREATE TABLE IF NOT EXISTS analysis_jobs (
    id                   UUID PRIMARY KEY,
    video_id             BIGINT NOT NULL REFERENCES videos (id) ON DELETE CASCADE,
    status               VARCHAR(32) NOT NULL DEFAULT 'PENDING',
    priority             INT NOT NULL DEFAULT 100,
    trigger_reason       VARCHAR(32) NOT NULL DEFAULT 'upload',
    model_bundle_version VARCHAR(64) NOT NULL DEFAULT 'cu-bundle-phase1',
    attempts             INT NOT NULL DEFAULT 0,
    locked_by            VARCHAR(64),
    locked_at            TIMESTAMPTZ,
    started_at           TIMESTAMPTZ,
    finished_at          TIMESTAMPTZ,
    error_code           VARCHAR(64),
    error_message        TEXT,
    metrics              JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT analysis_jobs_status_chk CHECK (
        status IN ('PENDING', 'RUNNING', 'COMPLETED', 'FAILED_RETRYABLE', 'FAILED_TERMINAL')
    )
);

CREATE INDEX IF NOT EXISTS idx_analysis_jobs_pending
    ON analysis_jobs (priority DESC, created_at ASC)
    WHERE status = 'PENDING';

CREATE INDEX IF NOT EXISTS idx_analysis_jobs_video
    ON analysis_jobs (video_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_analysis_jobs_running
    ON analysis_jobs (locked_at ASC)
    WHERE status = 'RUNNING';

CREATE TABLE IF NOT EXISTS analysis_job_logs (
    id         BIGSERIAL PRIMARY KEY,
    job_id     UUID NOT NULL REFERENCES analysis_jobs (id) ON DELETE CASCADE,
    stage      VARCHAR(64) NOT NULL,
    level      VARCHAR(16) NOT NULL DEFAULT 'INFO',
    message    TEXT NOT NULL,
    detail     JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_analysis_job_logs_job ON analysis_job_logs (job_id, created_at);

CREATE TABLE IF NOT EXISTS cu_event_outbox (
    id             BIGSERIAL PRIMARY KEY,
    aggregate_type VARCHAR(64) NOT NULL,
    aggregate_id   VARCHAR(64) NOT NULL,
    event_type     VARCHAR(96) NOT NULL,
    payload        JSONB NOT NULL,
    created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    published_at   TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_cu_event_outbox_unpublished
    ON cu_event_outbox (created_at ASC)
    WHERE published_at IS NULL;

CREATE TABLE IF NOT EXISTS model_versions (
    id           BIGSERIAL PRIMARY KEY,
    name         VARCHAR(64) NOT NULL,
    version      VARCHAR(64) NOT NULL,
    artifact_uri TEXT,
    metrics      JSONB NOT NULL DEFAULT '{}'::jsonb,
    status       VARCHAR(16) NOT NULL DEFAULT 'staged',
    owner_name   VARCHAR(128),
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT model_versions_uq UNIQUE (name, version),
    CONSTRAINT model_versions_status_chk CHECK (status IN ('staged', 'prod', 'retired'))
);

-- Seed core semantic tags (Phase 1 lexicon)
INSERT INTO semantic_tags (slug, name, language, status) VALUES
    ('anime', 'Anime', 'en', 'active'),
    ('music', 'Music', 'en', 'active'),
    ('horror', 'Horror', 'en', 'active'),
    ('gaming', 'Gaming', 'en', 'active'),
    ('food', 'Food', 'en', 'active'),
    ('travel', 'Travel', 'en', 'active'),
    ('comedy', 'Comedy', 'en', 'active'),
    ('education', 'Education', 'en', 'active'),
    ('night', 'Night', 'en', 'active'),
    ('sad', 'Sad', 'en', 'active'),
    ('girl', 'Girl', 'en', 'active'),
    ('boy', 'Boy', 'en', 'active'),
    ('cat', 'Cat', 'en', 'active'),
    ('dog', 'Dog', 'en', 'active'),
    ('city', 'City', 'en', 'active'),
    ('rain', 'Rain', 'en', 'active'),
    ('lofi', 'Lofi', 'en', 'active'),
    ('lyrics', 'Lyrics', 'en', 'active'),
    ('manga', 'Manga', 'en', 'active'),
    ('coding', 'Coding', 'en', 'active')
ON CONFLICT (slug) DO NOTHING;

INSERT INTO semantic_tag_aliases (tag_id, alias, language)
SELECT t.id, a.alias, a.lang
FROM (VALUES
    ('horror', 'kinhdi', 'vi'),
    ('horror', 'kinh dị', 'vi'),
    ('music', 'amnhac', 'vi'),
    ('music', 'âm nhạc', 'vi'),
    ('anime', 'hoathinhnhat', 'vi'),
    ('food', 'amthuc', 'vi'),
    ('food', 'đồ ăn', 'vi'),
    ('gaming', 'game', 'en'),
    ('coding', 'laptrinh', 'vi'),
    ('coding', 'java', 'en')
) AS a(slug, alias, lang)
JOIN semantic_tags t ON t.slug = a.slug
ON CONFLICT (alias, language) DO NOTHING;

-- Map tags → Explore categories (presentation layer)
INSERT INTO category_tag_mapping (category_id, tag_id, weight, priority)
SELECT c.id, t.id, m.weight, m.priority
FROM (VALUES
    ('anime', 'anime', 1.0, 10),
    ('anime', 'manga', 0.8, 20),
    ('music', 'music', 1.0, 10),
    ('music', 'lofi', 0.9, 20),
    ('music', 'lyrics', 0.85, 30),
    ('horror', 'horror', 1.0, 10),
    ('gaming', 'gaming', 1.0, 10),
    ('food', 'food', 1.0, 10),
    ('travel', 'travel', 1.0, 10),
    ('comedy', 'comedy', 1.0, 10),
    ('education', 'education', 1.0, 10),
    ('education', 'coding', 0.9, 20)
) AS m(cat_slug, tag_slug, weight, priority)
JOIN categories c ON c.slug = m.cat_slug
JOIN semantic_tags t ON t.slug = m.tag_slug
ON CONFLICT (category_id, tag_id) DO NOTHING;

INSERT INTO model_versions (name, version, artifact_uri, status, owner_name, metrics)
VALUES
    ('metadata-lexicon', 'phase1-v1', 'inline:python-lexicon', 'prod', 'vibely-ml', '{"ece":0.0}'::jsonb),
    ('paddleocr', 'phase1-stub', 'optional', 'staged', 'vibely-ml', '{}'::jsonb)
ON CONFLICT (name, version) DO NOTHING;
