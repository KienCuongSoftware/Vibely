ALTER TABLE users
    ADD COLUMN preferred_locale VARCHAR(16) NOT NULL DEFAULT 'en';
