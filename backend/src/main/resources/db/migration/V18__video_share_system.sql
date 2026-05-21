-- =============================================================================
-- V18: TikTok-style video sharing (short links, share events, redirect analytics)
-- =============================================================================
-- UUID primary keys: application generates UUIDv7 (time-ordered) for index locality
-- on high-volume append tables. No DB default — see com.vibely.backend.share.UuidV7.
--
-- Partitioning: redirect_logs is append-only at very high QPS. V18 ships as a
-- single table + BRIN index; migrate to RANGE(created_at) monthly when volume
-- exceeds ~10M rows/month (see comments at bottom).
-- =============================================================================

-- ---------------------------------------------------------------------------
-- short_links — resolver table (hot path: short_code → video_id)
-- ---------------------------------------------------------------------------
CREATE TABLE short_links (
    id                  UUID            NOT NULL,
    short_code          VARCHAR(12)     NOT NULL,
    video_id            BIGINT          NOT NULL REFERENCES videos(id) ON DELETE CASCADE,
    created_by_user_id  BIGINT          REFERENCES users(id) ON DELETE SET NULL,
    channel             VARCHAR(32),
    is_primary          BOOLEAN         NOT NULL DEFAULT FALSE,
    status              VARCHAR(16)     NOT NULL DEFAULT 'ACTIVE',
    expires_at          TIMESTAMPTZ,
    click_count         BIGINT          NOT NULL DEFAULT 0,
    last_clicked_at     TIMESTAMPTZ,
    created_at          TIMESTAMPTZ     NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ     NOT NULL DEFAULT now(),
    CONSTRAINT pk_short_links PRIMARY KEY (id),
    CONSTRAINT uk_short_links_code UNIQUE (short_code),
    CONSTRAINT chk_short_links_status CHECK (status IN ('ACTIVE', 'REVOKED', 'EXPIRED')),
    CONSTRAINT chk_short_links_code_format CHECK (short_code ~ '^[0-9A-Za-z]{6,12}$')
);

COMMENT ON TABLE short_links IS
    'Public short URL registry. Hot lookup by short_code; cache in Redis sl:{code}.';
COMMENT ON COLUMN short_links.is_primary IS
    'At most one ACTIVE primary link per video (partial unique index below).';
COMMENT ON COLUMN short_links.click_count IS
    'Denormalized counter; reconciled async from redirect_logs for display.';

-- Redirect hot path: unique active code (covers GET /v/{code} WHERE status=ACTIVE)
CREATE UNIQUE INDEX idx_short_links_active_code
    ON short_links (short_code)
    WHERE status = 'ACTIVE';

-- One canonical primary short link per video (optional; new shares may create non-primary codes)
CREATE UNIQUE INDEX uk_short_links_primary_active
    ON short_links (video_id)
    WHERE is_primary = TRUE AND status = 'ACTIVE';

CREATE INDEX idx_short_links_video_created
    ON short_links (video_id, created_at DESC);

CREATE INDEX idx_short_links_creator
    ON short_links (created_by_user_id, created_at DESC)
    WHERE created_by_user_id IS NOT NULL;

-- ---------------------------------------------------------------------------
-- video_shares — authenticated share intents (copy, social, embed, native)
-- ---------------------------------------------------------------------------
CREATE TABLE video_shares (
    id                  UUID            NOT NULL,
    video_id            BIGINT          NOT NULL REFERENCES videos(id) ON DELETE CASCADE,
    user_id             BIGINT          REFERENCES users(id) ON DELETE SET NULL,
    short_link_id       UUID            REFERENCES short_links(id) ON DELETE SET NULL,
    channel             VARCHAR(32)     NOT NULL,
    idempotency_key     VARCHAR(64),
    referrer            VARCHAR(2048),
    ip_hash             VARCHAR(64),
    user_agent_hash     VARCHAR(64),
    device_class        VARCHAR(32),
    browser_family      VARCHAR(64),
    os_family           VARCHAR(64),
    country_code        VARCHAR(2),
    created_at          TIMESTAMPTZ     NOT NULL DEFAULT now(),
    CONSTRAINT pk_video_shares PRIMARY KEY (id),
    CONSTRAINT chk_video_shares_channel CHECK (char_length(trim(channel)) > 0)
);

COMMENT ON TABLE video_shares IS
    'User-initiated share actions (POST /api/v1/videos/{id}/share). Idempotent via idempotency_key.';

CREATE UNIQUE INDEX uk_video_shares_idempotency
    ON video_shares (idempotency_key)
    WHERE idempotency_key IS NOT NULL;

CREATE INDEX idx_video_shares_video_created
    ON video_shares (video_id, created_at DESC);

CREATE INDEX idx_video_shares_user_created
    ON video_shares (user_id, created_at DESC)
    WHERE user_id IS NOT NULL;

CREATE INDEX idx_video_shares_video_channel
    ON video_shares (video_id, channel, created_at DESC);

-- Anti-abuse: limit duplicate share spam same user/video/channel per day (application + optional enforcement)
CREATE INDEX idx_video_shares_dedupe_daily
    ON video_shares (user_id, video_id, channel, ((created_at AT TIME ZONE 'UTC')::date))
    WHERE user_id IS NOT NULL;

-- ---------------------------------------------------------------------------
-- redirect_logs — append-only short-link click stream (LINK_CLICKED)
-- ---------------------------------------------------------------------------
CREATE TABLE redirect_logs (
    id                  UUID            NOT NULL,
    short_link_id       UUID            NOT NULL REFERENCES short_links(id) ON DELETE CASCADE,
    video_id            BIGINT          NOT NULL REFERENCES videos(id) ON DELETE CASCADE,
    short_code          VARCHAR(12)     NOT NULL,
    visitor_key         VARCHAR(64),
    ip_hash             VARCHAR(64),
    user_agent          TEXT,
    referer             VARCHAR(2048),
    device_class        VARCHAR(32),
    browser_family      VARCHAR(64),
    os_family           VARCHAR(64),
    country_code        VARCHAR(2),
    accept_language     VARCHAR(128),
    is_bot              BOOLEAN         NOT NULL DEFAULT FALSE,
    response_status     SMALLINT        NOT NULL DEFAULT 302,
    created_at          TIMESTAMPTZ     NOT NULL DEFAULT now(),
    CONSTRAINT pk_redirect_logs PRIMARY KEY (id)
);

COMMENT ON TABLE redirect_logs IS
    'Append-only redirect access log. Partition by RANGE(created_at) when scale requires it.';
COMMENT ON COLUMN redirect_logs.visitor_key IS
    'SHA-256(ip_hash + ua_hash + daily_salt) for unique visitor estimation without storing raw IP.';

-- BRIN: cheap index for time-range scans / archival / rollup jobs on append-only data
CREATE INDEX idx_redirect_logs_created_brin
    ON redirect_logs USING BRIN (created_at);

CREATE INDEX idx_redirect_logs_short_link_created
    ON redirect_logs (short_link_id, created_at DESC);

CREATE INDEX idx_redirect_logs_video_created
    ON redirect_logs (video_id, created_at DESC);

CREATE INDEX idx_redirect_logs_code_created
    ON redirect_logs (short_code, created_at DESC);

CREATE INDEX idx_redirect_logs_visitor_video
    ON redirect_logs (video_id, visitor_key, created_at DESC)
    WHERE visitor_key IS NOT NULL;

-- ---------------------------------------------------------------------------
-- share_analytics — append-only enriched events (aggregation-ready)
-- ---------------------------------------------------------------------------
CREATE TABLE share_analytics (
    id                  UUID            NOT NULL,
    video_id            BIGINT          NOT NULL REFERENCES videos(id) ON DELETE CASCADE,
    short_link_id       UUID            REFERENCES short_links(id) ON DELETE SET NULL,
    video_share_id      UUID            REFERENCES video_shares(id) ON DELETE SET NULL,
    redirect_log_id     UUID            REFERENCES redirect_logs(id) ON DELETE SET NULL,
    event_type          VARCHAR(32)     NOT NULL,
    channel             VARCHAR(32),
    share_source        VARCHAR(32),
    device_class        VARCHAR(32),
    browser_family      VARCHAR(64),
    os_family           VARCHAR(64),
    country_code        VARCHAR(2),
    referrer            VARCHAR(2048),
    visitor_key         VARCHAR(64),
    ip_hash             VARCHAR(64),
    metadata            JSONB,
    event_at            TIMESTAMPTZ     NOT NULL DEFAULT now(),
    CONSTRAINT pk_share_analytics PRIMARY KEY (id),
    CONSTRAINT chk_share_analytics_event CHECK (
        event_type IN ('SHARE_CREATED', 'LINK_CLICKED', 'ANALYTICS_UPDATED')
    )
);

COMMENT ON TABLE share_analytics IS
    'Unified append-only analytics stream. Workers roll up to dashboards / materialized views.';
COMMENT ON COLUMN share_analytics.metadata IS
    'Extensible JSON: campaign, app_version, deep_link, etc.';

CREATE INDEX idx_share_analytics_video_event_at
    ON share_analytics (video_id, event_type, event_at DESC);

CREATE INDEX idx_share_analytics_channel_country
    ON share_analytics (video_id, channel, country_code, event_at DESC);

CREATE INDEX idx_share_analytics_event_at_brin
    ON share_analytics USING BRIN (event_at);

-- Covering index for GET /api/v1/videos/{id}/share/analytics time-range queries
CREATE INDEX idx_share_analytics_video_range
    ON share_analytics (video_id, event_at DESC)
    INCLUDE (event_type, channel, country_code, device_class);

-- ---------------------------------------------------------------------------
-- Future: monthly RANGE partitions for redirect_logs (run when traffic grows)
-- ---------------------------------------------------------------------------
-- CREATE TABLE redirect_logs ( ... ) PARTITION BY RANGE (created_at);
-- CREATE TABLE redirect_logs_y2026m05 PARTITION OF redirect_logs
--     FOR VALUES FROM ('2026-05-01') TO ('2026-06-01');
-- Schedule pg_partman or cron to CREATE TABLE ... PARTITION OF monthly.
