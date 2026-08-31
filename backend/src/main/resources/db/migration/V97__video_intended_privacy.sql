-- Creator-selected privacy while a post is under encoding / moderation review.
ALTER TABLE videos
    ADD COLUMN IF NOT EXISTS intended_privacy VARCHAR(20);

COMMENT ON COLUMN videos.intended_privacy IS
    'Privacy chosen at publish; effective privacy stays PRIVATE until review clears.';
