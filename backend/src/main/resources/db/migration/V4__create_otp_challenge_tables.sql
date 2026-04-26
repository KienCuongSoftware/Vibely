CREATE TABLE otp_challenges (
    id BIGSERIAL PRIMARY KEY,
    email VARCHAR(120) NOT NULL,
    challenge_type VARCHAR(40) NOT NULL,
    challenge_payload TEXT,
    challenge_response TEXT,
    passed BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_otp_challenges_email_created_at ON otp_challenges(email, created_at DESC);

CREATE TABLE otp_verification_codes (
    id BIGSERIAL PRIMARY KEY,
    email VARCHAR(120) NOT NULL,
    code_hash VARCHAR(128) NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    consumed BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_otp_codes_email_created_at ON otp_verification_codes(email, created_at DESC);
CREATE INDEX idx_otp_codes_expires_at ON otp_verification_codes(expires_at);
