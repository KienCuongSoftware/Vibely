ALTER TABLE users
    ADD COLUMN birth_date DATE NULL,
    ADD COLUMN onboarding_completed BOOLEAN NOT NULL DEFAULT FALSE;

UPDATE users SET onboarding_completed = TRUE;
