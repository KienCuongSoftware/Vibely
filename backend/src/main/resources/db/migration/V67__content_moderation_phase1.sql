-- Intelligent Content Moderation — Phase 1
-- Policy consumer over CU + Originality features (no second inference pipeline).

-- ---------------------------------------------------------------------------
-- Policy config
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS policy_versions (
    id                BIGSERIAL PRIMARY KEY,
    code              VARCHAR(64) NOT NULL,
    thresholds_json   JSONB NOT NULL DEFAULT '{}'::jsonb,
    weights_json      JSONB NOT NULL DEFAULT '{}'::jsonb,
    published_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    is_active         BOOLEAN NOT NULL DEFAULT FALSE,
    notes             TEXT,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT policy_versions_code_uq UNIQUE (code)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_policy_versions_one_active
    ON policy_versions ((is_active))
    WHERE is_active = TRUE;

CREATE TABLE IF NOT EXISTS moderation_rules (
    id              BIGSERIAL PRIMARY KEY,
    code            VARCHAR(96) NOT NULL,
    label           VARCHAR(64) NOT NULL,
    priority        INT NOT NULL DEFAULT 100,
    enabled         BOOLEAN NOT NULL DEFAULT TRUE,
    match_json      JSONB NOT NULL DEFAULT '{}'::jsonb,
    severity        VARCHAR(16) NOT NULL DEFAULT 'MEDIUM',
    action_hint     VARCHAR(16) NOT NULL DEFAULT 'REVIEW',
    override_flag   BOOLEAN NOT NULL DEFAULT FALSE,
    points          INT NOT NULL DEFAULT 10,
    description     TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT moderation_rules_code_uq UNIQUE (code),
    CONSTRAINT moderation_rules_severity_chk CHECK (
        severity IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')
    ),
    CONSTRAINT moderation_rules_action_chk CHECK (
        action_hint IN ('ALLOW', 'LIMIT', 'REVIEW', 'BLOCK', 'DELETE')
    )
);

CREATE TABLE IF NOT EXISTS moderation_rule_versions (
    id                 BIGSERIAL PRIMARY KEY,
    policy_version_id  BIGINT NOT NULL REFERENCES policy_versions (id) ON DELETE CASCADE,
    rule_code          VARCHAR(96) NOT NULL,
    label              VARCHAR(64) NOT NULL,
    priority           INT NOT NULL DEFAULT 100,
    match_json         JSONB NOT NULL DEFAULT '{}'::jsonb,
    severity           VARCHAR(16) NOT NULL,
    action_hint        VARCHAR(16) NOT NULL,
    override_flag      BOOLEAN NOT NULL DEFAULT FALSE,
    points             INT NOT NULL DEFAULT 10,
    description        TEXT,
    CONSTRAINT moderation_rule_versions_uq UNIQUE (policy_version_id, rule_code)
);

-- ---------------------------------------------------------------------------
-- Jobs / reports / evidence
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS moderation_jobs (
    id                      BIGSERIAL PRIMARY KEY,
    video_id                BIGINT NOT NULL REFERENCES videos (id) ON DELETE CASCADE,
    analysis_job_id         UUID REFERENCES analysis_jobs (id) ON DELETE SET NULL,
    originality_report_id   BIGINT REFERENCES originality_reports (id) ON DELETE SET NULL,
    policy_version          VARCHAR(64) NOT NULL,
    job_state               VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    originality_pending     BOOLEAN NOT NULL DEFAULT FALSE,
    attempts                INT NOT NULL DEFAULT 0,
    claimed_at              TIMESTAMPTZ,
    last_error              TEXT,
    snapshot_json           JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT moderation_jobs_state_chk CHECK (
        job_state IN ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED')
    )
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_moderation_jobs_idempotent
    ON moderation_jobs (
        video_id,
        policy_version,
        COALESCE(analysis_job_id::text, ''),
        COALESCE(originality_report_id::text, '')
    );

CREATE INDEX IF NOT EXISTS idx_moderation_jobs_pending
    ON moderation_jobs (created_at ASC)
    WHERE job_state = 'PENDING';

CREATE INDEX IF NOT EXISTS idx_moderation_jobs_processing
    ON moderation_jobs (claimed_at ASC)
    WHERE job_state = 'PROCESSING';

CREATE INDEX IF NOT EXISTS idx_moderation_jobs_video
    ON moderation_jobs (video_id, created_at DESC);

CREATE TABLE IF NOT EXISTS moderation_reports (
    id                    BIGSERIAL PRIMARY KEY,
    job_id                BIGINT NOT NULL UNIQUE REFERENCES moderation_jobs (id) ON DELETE CASCADE,
    video_id              BIGINT NOT NULL REFERENCES videos (id) ON DELETE CASCADE,
    policy_version        VARCHAR(64) NOT NULL,
    risk                  INT NOT NULL,
    confidence            DOUBLE PRECISION NOT NULL,
    decision              VARCHAR(16) NOT NULL,
    status                VARCHAR(16) NOT NULL DEFAULT 'OPEN',
    override_applied      BOOLEAN NOT NULL DEFAULT FALSE,
    originality_pending   BOOLEAN NOT NULL DEFAULT FALSE,
    explain_json          JSONB NOT NULL DEFAULT '{}'::jsonb,
    engine_version        VARCHAR(64) NOT NULL DEFAULT 'mod-policy-v1',
    created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT moderation_reports_risk_chk CHECK (risk >= 0 AND risk <= 100),
    CONSTRAINT moderation_reports_conf_chk CHECK (confidence >= 0 AND confidence <= 1),
    CONSTRAINT moderation_reports_decision_chk CHECK (
        decision IN ('ALLOW', 'LIMIT', 'REVIEW', 'BLOCK', 'DELETE')
    ),
    CONSTRAINT moderation_reports_status_chk CHECK (
        status IN ('OPEN', 'APPLIED', 'SUPERSEDED', 'SHADOW')
    )
);

CREATE INDEX IF NOT EXISTS idx_moderation_reports_video
    ON moderation_reports (video_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_moderation_reports_decision
    ON moderation_reports (decision);

CREATE TABLE IF NOT EXISTS moderation_evidence (
    id              BIGSERIAL PRIMARY KEY,
    report_id       BIGINT NOT NULL REFERENCES moderation_reports (id) ON DELETE CASCADE,
    source_modality VARCHAR(32) NOT NULL,
    reason_code     VARCHAR(96) NOT NULL,
    snippet         TEXT,
    frame_index     INT,
    time_ms         INT,
    weight          DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    ref_json        JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT moderation_evidence_modality_chk CHECK (
        source_modality IN (
            'OCR', 'SPEECH', 'TAG', 'OBJECT', 'SCENE',
            'ORIGINALITY', 'METADATA', 'USER_REPORT', 'PLUGIN', 'RULE'
        )
    )
);

CREATE INDEX IF NOT EXISTS idx_moderation_evidence_report
    ON moderation_evidence (report_id);

CREATE TABLE IF NOT EXISTS moderation_policy_results (
    id            BIGSERIAL PRIMARY KEY,
    report_id     BIGINT NOT NULL REFERENCES moderation_reports (id) ON DELETE CASCADE,
    label         VARCHAR(64) NOT NULL,
    outcome       VARCHAR(16) NOT NULL,
    score         DOUBLE PRECISION NOT NULL DEFAULT 0,
    rule_codes    JSONB NOT NULL DEFAULT '[]'::jsonb,
    detail_json   JSONB NOT NULL DEFAULT '{}'::jsonb,
    CONSTRAINT moderation_policy_results_outcome_chk CHECK (
        outcome IN ('ALLOW', 'LIMIT', 'REVIEW', 'BLOCK', 'DELETE', 'NONE')
    )
);

CREATE INDEX IF NOT EXISTS idx_moderation_policy_results_report
    ON moderation_policy_results (report_id);

CREATE TABLE IF NOT EXISTS moderation_decisions (
    id                   BIGSERIAL PRIMARY KEY,
    video_id             BIGINT NOT NULL UNIQUE REFERENCES videos (id) ON DELETE CASCADE,
    report_id            BIGINT REFERENCES moderation_reports (id) ON DELETE SET NULL,
    effective_decision   VARCHAR(16) NOT NULL,
    explore_eligible     BOOLEAN NOT NULL DEFAULT TRUE,
    review_required      BOOLEAN NOT NULL DEFAULT FALSE,
    status_applied       VARCHAR(32),
    applied_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    applied_by           VARCHAR(64) NOT NULL DEFAULT 'SYSTEM',
    shadow               BOOLEAN NOT NULL DEFAULT FALSE,
    updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT moderation_decisions_decision_chk CHECK (
        effective_decision IN ('ALLOW', 'LIMIT', 'REVIEW', 'BLOCK', 'DELETE')
    )
);

CREATE INDEX IF NOT EXISTS idx_moderation_decisions_explore
    ON moderation_decisions (explore_eligible)
    WHERE explore_eligible = FALSE;

-- ---------------------------------------------------------------------------
-- HITL stubs (Phase 2 fills Admin UI)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS moderation_review_queue (
    id              BIGSERIAL PRIMARY KEY,
    video_id        BIGINT NOT NULL REFERENCES videos (id) ON DELETE CASCADE,
    report_id       BIGINT NOT NULL REFERENCES moderation_reports (id) ON DELETE CASCADE,
    priority        INT NOT NULL DEFAULT 100,
    queue_state     VARCHAR(20) NOT NULL DEFAULT 'OPEN',
    claimed_by      VARCHAR(128),
    claimed_at      TIMESTAMPTZ,
    reason          VARCHAR(64) NOT NULL DEFAULT 'AI_REVIEW',
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT moderation_review_queue_state_chk CHECK (
        queue_state IN ('OPEN', 'CLAIMED', 'RESOLVED', 'DISMISSED')
    )
);

CREATE INDEX IF NOT EXISTS idx_moderation_review_queue_open
    ON moderation_review_queue (priority DESC, created_at ASC)
    WHERE queue_state IN ('OPEN', 'CLAIMED');

CREATE TABLE IF NOT EXISTS moderator_actions (
    id              BIGSERIAL PRIMARY KEY,
    queue_id        BIGINT REFERENCES moderation_review_queue (id) ON DELETE SET NULL,
    video_id        BIGINT NOT NULL REFERENCES videos (id) ON DELETE CASCADE,
    report_id       BIGINT REFERENCES moderation_reports (id) ON DELETE SET NULL,
    actor_user_id   BIGINT REFERENCES users (id) ON DELETE SET NULL,
    action_type     VARCHAR(32) NOT NULL,
    from_decision   VARCHAR(16),
    to_decision     VARCHAR(16),
    reason_code     VARCHAR(64),
    reason_text     TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS moderation_audit_logs (
    id              BIGSERIAL PRIMARY KEY,
    video_id        BIGINT REFERENCES videos (id) ON DELETE SET NULL,
    report_id       BIGINT REFERENCES moderation_reports (id) ON DELETE SET NULL,
    actor           VARCHAR(128) NOT NULL,
    action          VARCHAR(64) NOT NULL,
    before_json     JSONB NOT NULL DEFAULT '{}'::jsonb,
    after_json      JSONB NOT NULL DEFAULT '{}'::jsonb,
    request_id      VARCHAR(64),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_moderation_audit_video
    ON moderation_audit_logs (video_id, created_at DESC);

CREATE TABLE IF NOT EXISTS creator_trust_scores (
    user_id         BIGINT PRIMARY KEY REFERENCES users (id) ON DELETE CASCADE,
    trust_score     DOUBLE PRECISION NOT NULL DEFAULT 0.5,
    sample_count    INT NOT NULL DEFAULT 0,
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT creator_trust_scores_range_chk CHECK (trust_score >= 0 AND trust_score <= 1)
);

CREATE TABLE IF NOT EXISTS creator_policy_history (
    id              BIGSERIAL PRIMARY KEY,
    user_id         BIGINT NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    video_id        BIGINT REFERENCES videos (id) ON DELETE SET NULL,
    decision        VARCHAR(16) NOT NULL,
    source          VARCHAR(32) NOT NULL DEFAULT 'SYSTEM',
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_creator_policy_history_user
    ON creator_policy_history (user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS moderation_event_outbox (
    id              BIGSERIAL PRIMARY KEY,
    aggregate_type  VARCHAR(64) NOT NULL,
    aggregate_id    VARCHAR(64) NOT NULL,
    event_type      VARCHAR(96) NOT NULL,
    payload         JSONB NOT NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    published_at    TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_moderation_event_outbox_unpublished
    ON moderation_event_outbox (created_at ASC)
    WHERE published_at IS NULL;

-- ---------------------------------------------------------------------------
-- Seed policy v1 + rules (frozen into moderation_rule_versions)
-- ---------------------------------------------------------------------------
INSERT INTO policy_versions (code, thresholds_json, weights_json, is_active, notes)
VALUES (
    '2026.07.1',
    '{"allow_max":24,"limit_max":49,"review_max":74,"confidence_floor":0.45}'::jsonb,
    '{"LOW":5,"MEDIUM":15,"HIGH":30,"CRITICAL":50}'::jsonb,
    TRUE,
    'Phase 1 lexicon + originality pack'
)
ON CONFLICT (code) DO NOTHING;

INSERT INTO moderation_rules (code, label, priority, enabled, match_json, severity, action_hint, override_flag, points, description)
VALUES
(
    'orig.block',
    'originality',
    10,
    TRUE,
    '{"type":"originality_decision","decisions":["BLOCK"],"min_confidence":0.65}'::jsonb,
    'HIGH',
    'BLOCK',
    TRUE,
    40,
    'Originality BLOCK with sufficient confidence'
),
(
    'orig.limit_distribution',
    'originality',
    20,
    TRUE,
    '{"type":"originality_decision","decisions":["LIMIT_DISTRIBUTION"]}'::jsonb,
    'MEDIUM',
    'LIMIT',
    FALSE,
    20,
    'Originality limited distribution'
),
(
    'orig.review',
    'originality',
    25,
    TRUE,
    '{"type":"originality_decision","decisions":["REVIEW"]}'::jsonb,
    'MEDIUM',
    'REVIEW',
    FALSE,
    18,
    'Originality needs human review'
),
(
    'lex.child_safety',
    'child_safety',
    5,
    TRUE,
    '{"type":"lexicon","fields":["ocr_text","speech_text"],"patterns":["\\bcsam\\b","\\bchild\\s*porn\\b","\\bunderage\\s*sex\\b"],"flags":"i"}'::jsonb,
    'CRITICAL',
    'REVIEW',
    TRUE,
    50,
    'High-precision child-safety lexicon → REVIEW (human)'
),
(
    'lex.terrorism',
    'terrorism',
    6,
    TRUE,
    '{"type":"lexicon","fields":["ocr_text","speech_text"],"patterns":["\\bmake\\s+a\\s+bomb\\b","\\bjoin\\s+isis\\b"],"flags":"i"}'::jsonb,
    'CRITICAL',
    'REVIEW',
    TRUE,
    50,
    'Terrorism threat lexicon → REVIEW'
),
(
    'lex.spam',
    'spam',
    80,
    TRUE,
    '{"type":"lexicon","fields":["ocr_text","speech_text","title","description"],"patterns":["\\btelegram\\s*@\\w+","\\bbit\\.ly/","\\bfollow\\s+for\\s+nudes\\b"],"flags":"i"}'::jsonb,
    'LOW',
    'LIMIT',
    FALSE,
    8,
    'Spam / scam bait lexicon'
),
(
    'tag.adult_hint',
    'sexual_content',
    70,
    TRUE,
    '{"type":"semantic_tags","slugs":["nsfw","explicit","porn","adult_content"],"min_confidence":0.7}'::jsonb,
    'HIGH',
    'REVIEW',
    FALSE,
    25,
    'Strong adult semantic tags'
)
ON CONFLICT (code) DO NOTHING;

INSERT INTO moderation_rule_versions (
    policy_version_id, rule_code, label, priority, match_json, severity, action_hint, override_flag, points, description
)
SELECT
    pv.id,
    r.code,
    r.label,
    r.priority,
    r.match_json,
    r.severity,
    r.action_hint,
    r.override_flag,
    r.points,
    r.description
FROM policy_versions pv
CROSS JOIN moderation_rules r
WHERE pv.code = '2026.07.1'
ON CONFLICT (policy_version_id, rule_code) DO NOTHING;
