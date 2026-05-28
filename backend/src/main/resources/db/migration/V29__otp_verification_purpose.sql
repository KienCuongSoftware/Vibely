ALTER TABLE otp_verification_codes
    ADD COLUMN purpose VARCHAR(32) NOT NULL DEFAULT 'REGISTER';

CREATE INDEX idx_otp_codes_email_purpose_created_at
    ON otp_verification_codes (email, purpose, created_at DESC);
