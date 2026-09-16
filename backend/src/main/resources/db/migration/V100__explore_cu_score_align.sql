-- CU used to write video_categories with score in [0.90, 1.5) while Explore/Inspiration
-- chips only count score >= 1.5, so tagged videos never appeared under any category.
-- Lift those rows to the Explore visibility floor without touching weaker soft scores.
UPDATE video_categories
SET score = 1.5
WHERE score >= 0.90
  AND score < 1.5;
