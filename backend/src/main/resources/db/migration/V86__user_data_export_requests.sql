CREATE TABLE user_data_export_requests (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    format VARCHAR(16) NOT NULL,
    categories TEXT NOT NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'PROCESSING',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    cancelled_at TIMESTAMP NULL
);

CREATE INDEX idx_user_data_export_requests_user_created
    ON user_data_export_requests (user_id, created_at DESC);
