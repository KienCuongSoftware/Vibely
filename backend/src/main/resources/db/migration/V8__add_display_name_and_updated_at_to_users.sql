ALTER TABLE users
    ADD COLUMN display_name VARCHAR(80),
    ADD COLUMN updated_at TIMESTAMP;

UPDATE users
SET
    display_name = COALESCE(NULLIF(username, ''), 'Vibely User'),
    updated_at = COALESCE(created_at, CURRENT_TIMESTAMP)
WHERE display_name IS NULL OR updated_at IS NULL;

ALTER TABLE users
    ALTER COLUMN display_name SET NOT NULL,
    ALTER COLUMN updated_at SET NOT NULL;
