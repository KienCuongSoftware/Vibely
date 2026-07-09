-- Drop weak secondary category links; each video should surface in one primary explore tab.
DELETE FROM video_categories vc
WHERE vc.category_id IN (SELECT id FROM categories WHERE slug <> 'all')
  AND vc.video_id IN (
    SELECT ranked.video_id
    FROM (
      SELECT
        vc2.video_id,
        vc2.category_id,
        ROW_NUMBER() OVER (
          PARTITION BY vc2.video_id
          ORDER BY vc2.score DESC, vc2.category_id ASC
        ) AS rank
      FROM video_categories vc2
      JOIN categories c2 ON c2.id = vc2.category_id
      WHERE c2.slug <> 'all'
    ) ranked
    WHERE ranked.rank > 1
  );

-- Remove legacy false-positive technology tags on dance/beauty-style captions.
DELETE FROM video_categories vc
USING categories c, videos v
WHERE vc.category_id = c.id
  AND vc.video_id = v.id
  AND c.slug = 'technology'
  AND vc.score < 2.0
  AND lower(coalesce(v.title, '') || ' ' || coalesce(v.description, '')) ~ '(gai|nhay|nhảy|xinh|dance|nhac|am nhac|girl|beauty|lam dep)';
