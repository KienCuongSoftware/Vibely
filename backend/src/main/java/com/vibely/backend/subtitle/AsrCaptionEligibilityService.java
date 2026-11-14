package com.vibely.backend.subtitle;

import com.vibely.backend.video.Video;
import com.vibely.backend.video.VideoRepository;
import java.util.List;
import java.util.Optional;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

/**
 * Combines structured music classification + ASR quality gates.
 * Avoids guessing from free-text captions alone.
 */
@Service
public class AsrCaptionEligibilityService {

    private final JdbcTemplate jdbcTemplate;
    private final VideoRepository videoRepository;

    public AsrCaptionEligibilityService(JdbcTemplate jdbcTemplate, VideoRepository videoRepository) {
        this.jdbcTemplate = jdbcTemplate;
        this.videoRepository = videoRepository;
    }

    /** Explore marked this video as music (not raw hashtag parsing). */
    public boolean isClassifiedMusic(Long videoId) {
        if (videoId == null) {
            return false;
        }
        Integer hit = jdbcTemplate.query(
            """
                SELECT 1
                FROM video_categories vc
                JOIN categories c ON c.id = vc.category_id
                WHERE vc.video_id = ?
                  AND c.enabled = TRUE
                  AND lower(c.slug) = 'music'
                LIMIT 1
                """,
            rs -> rs.next() ? 1 : 0,
            videoId
        );
        return hit != null && hit == 1;
    }

    public boolean shouldSkipCaptions(Long videoId) {
        return isClassifiedMusic(videoId);
    }

    public List<SubtitleCueDto> reliableCuesForVideo(Long videoId, List<SubtitleCueDto> cues) {
        Integer durationSeconds = null;
        Optional<Video> video = videoRepository.findById(videoId);
        if (video.isPresent()) {
            durationSeconds = video.get().getDurationSeconds();
        }
        return AsrCaptionEligibility.filterReliableCues(cues, durationSeconds);
    }
}
