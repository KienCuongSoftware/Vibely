-- Optional place attached at Studio publish (Nominatim / free-text).

ALTER TABLE videos
    ADD COLUMN IF NOT EXISTS location_name VARCHAR(180),
    ADD COLUMN IF NOT EXISTS location_address VARCHAR(400),
    ADD COLUMN IF NOT EXISTS location_lat DOUBLE PRECISION,
    ADD COLUMN IF NOT EXISTS location_lng DOUBLE PRECISION,
    ADD COLUMN IF NOT EXISTS location_place_id VARCHAR(64);
