CREATE TABLE IF NOT EXISTS user_login_history (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    ip_address VARCHAR(64),
    country VARCHAR(120),
    province VARCHAR(120),
    city VARCHAR(120),
    district VARCHAR(120),
    ward VARCHAR(120),
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    browser VARCHAR(80),
    operating_system VARCHAR(80),
    device_type VARCHAR(40),
    fingerprint VARCHAR(128),
    login_time TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_user_login_history_user_time
    ON user_login_history(user_id, login_time DESC);

CREATE INDEX IF NOT EXISTS idx_user_login_history_fingerprint
    ON user_login_history(user_id, fingerprint);
