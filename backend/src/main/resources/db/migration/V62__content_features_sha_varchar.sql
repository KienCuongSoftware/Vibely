-- Hibernate validates VARCHAR; V61 used CHAR(64) (= bpchar).
ALTER TABLE content_features
    ALTER COLUMN content_sha256 TYPE VARCHAR(64);
