package com.vibely.backend.discovery.repository;

import com.vibely.backend.discovery.model.VideoEngagementStats;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface VideoEngagementStatsRepository extends JpaRepository<VideoEngagementStats, Long> {
    Optional<VideoEngagementStats> findByVideoId(Long videoId);

    @Modifying
    @Query(
        value = """
            INSERT INTO video_engagement_stats (
                video_id, views, watch_time_ms, completion_rate, rewatch_rate,
                share_rate, save_rate, comment_rate, follow_conversion_rate,
                engagement_score, explore_score, ranking_score, updated_at
            ) VALUES (
                :videoId, :views, :watchTimeMs, :completionRate, :rewatchRate,
                :shareRate, :saveRate, :commentRate, 0,
                :engagementScore, :exploreScore, :rankingScore, CURRENT_TIMESTAMP
            )
            ON CONFLICT (video_id) DO UPDATE SET
                views = EXCLUDED.views,
                watch_time_ms = EXCLUDED.watch_time_ms,
                completion_rate = EXCLUDED.completion_rate,
                rewatch_rate = EXCLUDED.rewatch_rate,
                share_rate = EXCLUDED.share_rate,
                save_rate = EXCLUDED.save_rate,
                comment_rate = EXCLUDED.comment_rate,
                engagement_score = EXCLUDED.engagement_score,
                explore_score = EXCLUDED.explore_score,
                ranking_score = EXCLUDED.ranking_score,
                updated_at = CURRENT_TIMESTAMP
            """,
        nativeQuery = true
    )
    void upsert(
        @Param("videoId") Long videoId,
        @Param("views") long views,
        @Param("watchTimeMs") long watchTimeMs,
        @Param("completionRate") double completionRate,
        @Param("rewatchRate") double rewatchRate,
        @Param("shareRate") double shareRate,
        @Param("saveRate") double saveRate,
        @Param("commentRate") double commentRate,
        @Param("engagementScore") double engagementScore,
        @Param("exploreScore") double exploreScore,
        @Param("rankingScore") double rankingScore
    );
}
