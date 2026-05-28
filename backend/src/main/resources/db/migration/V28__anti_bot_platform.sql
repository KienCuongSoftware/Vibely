CREATE TABLE IF NOT EXISTS anti_bot_device_fingerprints (
    id BIGSERIAL PRIMARY KEY,
    device_hash VARCHAR(128) NOT NULL UNIQUE,
    user_id BIGINT NULL REFERENCES users(id) ON DELETE SET NULL,
    fingerprint_json JSONB NOT NULL,
    trust_score INT NOT NULL DEFAULT 50,
    automation_flags JSONB NULL,
    first_seen_at TIMESTAMP NOT NULL DEFAULT NOW(),
    last_seen_at TIMESTAMP NOT NULL DEFAULT NOW(),
    seen_count BIGINT NOT NULL DEFAULT 1
);

CREATE INDEX IF NOT EXISTS idx_ab_device_hash ON anti_bot_device_fingerprints(device_hash);
CREATE INDEX IF NOT EXISTS idx_ab_device_user ON anti_bot_device_fingerprints(user_id);

CREATE TABLE IF NOT EXISTS anti_bot_trust_scores (
    id BIGSERIAL PRIMARY KEY,
    subject_type VARCHAR(32) NOT NULL,
    subject_key VARCHAR(128) NOT NULL,
    trust_score INT NOT NULL DEFAULT 50,
    successful_captcha_count INT NOT NULL DEFAULT 0,
    failed_captcha_count INT NOT NULL DEFAULT 0,
    abuse_signal_count INT NOT NULL DEFAULT 0,
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_ab_trust_subject UNIQUE (subject_type, subject_key)
);

CREATE TABLE IF NOT EXISTS anti_bot_risk_events (
    id BIGSERIAL PRIMARY KEY,
    session_id VARCHAR(64) NULL,
    user_id BIGINT NULL REFERENCES users(id) ON DELETE SET NULL,
    device_hash VARCHAR(128) NULL,
    ip_hash VARCHAR(128) NULL,
    action VARCHAR(64) NOT NULL,
    risk_score INT NOT NULL,
    risk_level VARCHAR(32) NOT NULL,
    challenge_level VARCHAR(32) NOT NULL,
    signals_json JSONB NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ab_risk_events_created ON anti_bot_risk_events(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ab_risk_events_user ON anti_bot_risk_events(user_id);

CREATE TABLE IF NOT EXISTS anti_bot_captcha_sessions (
    id BIGSERIAL PRIMARY KEY,
    challenge_id VARCHAR(64) NOT NULL UNIQUE,
    challenge_type VARCHAR(32) NOT NULL,
    device_hash VARCHAR(128) NULL,
    ip_hash VARCHAR(128) NULL,
    solved BOOLEAN NOT NULL DEFAULT FALSE,
    attempts INT NOT NULL DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMP NOT NULL,
    solved_at TIMESTAMP NULL
);

CREATE INDEX IF NOT EXISTS idx_ab_captcha_expires ON anti_bot_captcha_sessions(expires_at);

CREATE TABLE IF NOT EXISTS anti_bot_behavior_samples (
    id BIGSERIAL PRIMARY KEY,
    session_id VARCHAR(64) NOT NULL,
    device_hash VARCHAR(128) NULL,
    entropy_score DOUBLE PRECISION NOT NULL,
    linear_ratio DOUBLE PRECISION NOT NULL,
    avg_speed DOUBLE PRECISION NOT NULL,
    sample_count INT NOT NULL,
    payload_json JSONB NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ab_behavior_session ON anti_bot_behavior_samples(session_id, created_at DESC);

CREATE TABLE IF NOT EXISTS anti_bot_abuse_reports (
    id BIGSERIAL PRIMARY KEY,
    reporter_user_id BIGINT NULL REFERENCES users(id) ON DELETE SET NULL,
    subject_type VARCHAR(32) NOT NULL,
    subject_key VARCHAR(128) NOT NULL,
    category VARCHAR(64) NOT NULL,
    detail TEXT NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'OPEN',
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);
