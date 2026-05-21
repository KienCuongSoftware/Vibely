package com.vibely.backend.share;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface ShareAnalyticsRepository extends JpaRepository<ShareAnalyticsEvent, UUID> {

    @Query(value = """
        SELECT event_type, channel, country_code, device_class, COUNT(*)::bigint
        FROM share_analytics
        WHERE video_id = :videoId
          AND event_at >= :since
        GROUP BY event_type, channel, country_code, device_class
        ORDER BY COUNT(*) DESC
        LIMIT 200
        """, nativeQuery = true)
    List<Object[]> aggregateSinceRaw(
        @Param("videoId") Long videoId,
        @Param("since") OffsetDateTime since
    );

    @Query("""
        SELECT COUNT(e)
        FROM ShareAnalyticsEvent e
        WHERE e.video.id = :videoId
          AND e.eventType = com.vibely.backend.share.ShareEventType.SHARE_CREATED
          AND e.eventAt >= :since
        """)
    long countShareEventsSince(
        @Param("videoId") Long videoId,
        @Param("since") OffsetDateTime since
    );

    @Query("""
        SELECT COUNT(e)
        FROM ShareAnalyticsEvent e
        WHERE e.video.id = :videoId
          AND e.eventType = com.vibely.backend.share.ShareEventType.LINK_CLICKED
          AND e.eventAt >= :since
        """)
    long countLinkClicksSince(
        @Param("videoId") Long videoId,
        @Param("since") OffsetDateTime since
    );

    @Query("""
        SELECT COUNT(DISTINCT e.visitorKey)
        FROM ShareAnalyticsEvent e
        WHERE e.video.id = :videoId
          AND e.eventType = com.vibely.backend.share.ShareEventType.LINK_CLICKED
          AND e.eventAt >= :since
          AND e.visitorKey IS NOT NULL
        """)
    long countUniqueVisitorsSince(
        @Param("videoId") Long videoId,
        @Param("since") OffsetDateTime since
    );
}
