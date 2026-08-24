-- Photo slideshow posts (Studio tab=photo).
ALTER TABLE videos
    ADD COLUMN media_kind VARCHAR(16) NOT NULL DEFAULT 'VIDEO',
    ADD COLUMN photo_urls TEXT NULL;
