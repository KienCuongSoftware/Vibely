-- Link existing videos with music-related hashtags to the music explore category.
INSERT INTO video_categories(video_id, category_id, score, created_at)
SELECT DISTINCT vh.video_id, c.id, 2.0, CURRENT_TIMESTAMP
FROM video_hashtags vh
JOIN hashtags h ON h.id = vh.hashtag_id
JOIN categories c ON c.slug = 'music'
LEFT JOIN video_categories vc ON vc.video_id = vh.video_id AND vc.category_id = c.id
WHERE lower(h.tag) IN (
    'lyrics', 'lyric', 'lyricvideo', 'music', 'song', 'nhac', 'amnhac', 'remix', 'cover',
    'karaoke', 'sing', 'singing', 'audio', 'sound', 'beat', 'edm', 'hiphop'
)
AND vc.video_id IS NULL;
