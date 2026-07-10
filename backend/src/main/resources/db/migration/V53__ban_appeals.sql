CREATE TABLE ban_appeals (
    id                   BIGSERIAL PRIMARY KEY,
    contact_email        VARCHAR(120) NOT NULL,
    description          VARCHAR(200) NOT NULL,
    ban_reason           VARCHAR(500),
    masked_account_email VARCHAR(120),
    user_id              BIGINT REFERENCES users(id),
    status               VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    admin_notes          VARCHAR(1000),
    reviewed_by_admin_id BIGINT,
    reviewed_at          TIMESTAMP,
    created_at           TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at           TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_ban_appeals_status_created ON ban_appeals(status, created_at DESC);
CREATE INDEX idx_ban_appeals_user_id ON ban_appeals(user_id);
