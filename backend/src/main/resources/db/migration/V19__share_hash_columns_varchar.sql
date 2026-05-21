-- Hibernate maps String + length to VARCHAR; V18 used CHAR for fixed-width hashes.
-- Align DB types with JPA entities (ddl-auto: validate).

ALTER TABLE video_shares
    ALTER COLUMN ip_hash TYPE VARCHAR(64),
    ALTER COLUMN user_agent_hash TYPE VARCHAR(64),
    ALTER COLUMN country_code TYPE VARCHAR(2);

ALTER TABLE redirect_logs
    ALTER COLUMN visitor_key TYPE VARCHAR(64),
    ALTER COLUMN ip_hash TYPE VARCHAR(64),
    ALTER COLUMN country_code TYPE VARCHAR(2);

ALTER TABLE share_analytics
    ALTER COLUMN country_code TYPE VARCHAR(2),
    ALTER COLUMN visitor_key TYPE VARCHAR(64),
    ALTER COLUMN ip_hash TYPE VARCHAR(64);
