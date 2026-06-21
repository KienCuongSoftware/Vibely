ALTER TABLE users
    ADD COLUMN IF NOT EXISTS account_status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
    ADD COLUMN IF NOT EXISTS deactivated_at TIMESTAMP;

UPDATE users
SET account_status = 'ACTIVE'
WHERE account_status IS NULL;
