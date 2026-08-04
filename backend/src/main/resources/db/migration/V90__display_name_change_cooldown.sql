-- Track last display-name (biệt danh) change for 7-day cooldown
ALTER TABLE users
    ADD COLUMN IF NOT EXISTS display_name_changed_at TIMESTAMPTZ NULL;
