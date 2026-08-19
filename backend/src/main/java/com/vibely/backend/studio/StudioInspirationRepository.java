package com.vibely.backend.studio;

import com.vibely.backend.explore.ExploreVideoProjection;
import com.vibely.backend.user.repository.SuggestedCreatorProjection;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface StudioInspirationRepository extends JpaRepository<StudioInspiration, Long> {

    boolean existsByUser_IdAndVideo_Id(Long userId, Long videoId);

    Optional<StudioInspiration> findByUser_IdAndVideo_Id(Long userId, Long videoId);

    void deleteByUser_IdAndVideo_Id(Long userId, Long videoId);

    void deleteByVideo_Id(Long videoId);

    long countByUser_Id(Long userId);

    @Query("""
        select i.video.id from StudioInspiration i
        where i.user.id = :userId and i.video.id in :videoIds
        """)
    List<Long> findSavedVideoIds(
        @Param("userId") Long userId,
        @Param("videoIds") Collection<Long> videoIds
    );

    @Query(
        value = """
            SELECT v.id AS id, v.public_id AS publicId, v.title AS title, v.description AS description,
                   v.video_url AS videoUrl, v.thumbnail_url AS thumbnailUrl,
                   v.master_playlist_url AS masterPlaylistUrl, v.share_count AS shareCount,
                   v.created_at AS createdAt, v.explore_score AS exploreScore,
                   u.id AS authorId, u.username AS authorUsername, u.display_name AS authorDisplayName,
                   coalesce(nullif(trim(u.avatar_url), ''), nullif(trim(u.google_avatar_url), ''),
                            '/images/users/default-avatar.jpeg') AS authorAvatarUrl
            FROM videos v
            JOIN users u ON u.id = v.author_id
            WHERE v.status = 'READY'
              AND coalesce(v.privacy, 'PUBLIC') = 'PUBLIC'
              AND coalesce(v.studio_draft, false) = false
              AND (v.scheduled_at IS NULL OR v.scheduled_at <= now())
              AND NOT EXISTS (
                  SELECT 1 FROM moderation_decisions md
                  WHERE md.video_id = v.id
                    AND md.explore_eligible = false
                    AND md.shadow = false
              )
              AND (:filterRegion = FALSE OR u.account_region = :region)
              AND (
                  :filterCategory = FALSE
                  OR EXISTS (
                      SELECT 1 FROM video_categories vc
                      JOIN categories c ON c.id = vc.category_id
                      WHERE vc.video_id = v.id
                        AND c.slug = :categorySlug
                        AND c.enabled = true
                        AND vc.score >= 1.5
                  )
              )
            ORDER BY v.explore_score DESC, v.created_at DESC, v.id DESC
            """,
        countQuery = """
            SELECT count(*)
            FROM videos v
            JOIN users u ON u.id = v.author_id
            WHERE v.status = 'READY'
              AND coalesce(v.privacy, 'PUBLIC') = 'PUBLIC'
              AND coalesce(v.studio_draft, false) = false
              AND (v.scheduled_at IS NULL OR v.scheduled_at <= now())
              AND NOT EXISTS (
                  SELECT 1 FROM moderation_decisions md
                  WHERE md.video_id = v.id
                    AND md.explore_eligible = false
                    AND md.shadow = false
              )
              AND (:filterRegion = FALSE OR u.account_region = :region)
              AND (
                  :filterCategory = FALSE
                  OR EXISTS (
                      SELECT 1 FROM video_categories vc
                      JOIN categories c ON c.id = vc.category_id
                      WHERE vc.video_id = v.id
                        AND c.slug = :categorySlug
                        AND c.enabled = true
                        AND vc.score >= 1.5
                  )
              )
            """,
        nativeQuery = true
    )
    Page<ExploreVideoProjection> findTrendingVideos(
        @Param("filterRegion") boolean filterRegion,
        @Param("region") String region,
        @Param("filterCategory") boolean filterCategory,
        @Param("categorySlug") String categorySlug,
        Pageable pageable
    );

    @Query(
        value = """
            SELECT v.id AS id, v.public_id AS publicId, v.title AS title, v.description AS description,
                   v.video_url AS videoUrl, v.thumbnail_url AS thumbnailUrl,
                   v.master_playlist_url AS masterPlaylistUrl, v.share_count AS shareCount,
                   v.created_at AS createdAt, v.explore_score AS exploreScore,
                   u.id AS authorId, u.username AS authorUsername, u.display_name AS authorDisplayName,
                   coalesce(nullif(trim(u.avatar_url), ''), nullif(trim(u.google_avatar_url), ''),
                            '/images/users/default-avatar.jpeg') AS authorAvatarUrl
            FROM videos v
            JOIN users u ON u.id = v.author_id
            WHERE v.status = 'READY'
              AND coalesce(v.privacy, 'PUBLIC') = 'PUBLIC'
              AND coalesce(v.studio_draft, false) = false
              AND (v.scheduled_at IS NULL OR v.scheduled_at <= now())
              AND v.author_id <> :authorId
              AND NOT EXISTS (
                  SELECT 1 FROM moderation_decisions md
                  WHERE md.video_id = v.id
                    AND md.explore_eligible = false
                    AND md.shadow = false
              )
              AND EXISTS (
                  SELECT 1 FROM video_categories vc
                  WHERE vc.video_id = v.id
                    AND vc.score >= 1.5
                    AND vc.category_id IN (
                        SELECT vc2.category_id
                        FROM video_categories vc2
                        JOIN videos mine ON mine.id = vc2.video_id
                        WHERE mine.author_id = :authorId
                          AND mine.status = 'READY'
                          AND coalesce(mine.studio_draft, false) = false
                          AND (mine.scheduled_at IS NULL OR mine.scheduled_at <= now())
                    )
              )
            ORDER BY v.explore_score DESC, v.created_at DESC, v.id DESC
            """,
        countQuery = """
            SELECT count(*)
            FROM videos v
            WHERE v.status = 'READY'
              AND coalesce(v.privacy, 'PUBLIC') = 'PUBLIC'
              AND coalesce(v.studio_draft, false) = false
              AND (v.scheduled_at IS NULL OR v.scheduled_at <= now())
              AND v.author_id <> :authorId
              AND NOT EXISTS (
                  SELECT 1 FROM moderation_decisions md
                  WHERE md.video_id = v.id
                    AND md.explore_eligible = false
                    AND md.shadow = false
              )
              AND EXISTS (
                  SELECT 1 FROM video_categories vc
                  WHERE vc.video_id = v.id
                    AND vc.score >= 1.5
                    AND vc.category_id IN (
                        SELECT vc2.category_id
                        FROM video_categories vc2
                        JOIN videos mine ON mine.id = vc2.video_id
                        WHERE mine.author_id = :authorId
                          AND mine.status = 'READY'
                          AND coalesce(mine.studio_draft, false) = false
                          AND (mine.scheduled_at IS NULL OR mine.scheduled_at <= now())
                    )
              )
            """,
        nativeQuery = true
    )
    Page<ExploreVideoProjection> findSimilarVideos(
        @Param("authorId") Long authorId,
        Pageable pageable
    );

    @Query(
        value = """
            SELECT v.id AS id, v.public_id AS publicId, v.title AS title, v.description AS description,
                   v.video_url AS videoUrl, v.thumbnail_url AS thumbnailUrl,
                   v.master_playlist_url AS masterPlaylistUrl, v.share_count AS shareCount,
                   v.created_at AS createdAt, v.explore_score AS exploreScore,
                   u.id AS authorId, u.username AS authorUsername, u.display_name AS authorDisplayName,
                   coalesce(nullif(trim(u.avatar_url), ''), nullif(trim(u.google_avatar_url), ''),
                            '/images/users/default-avatar.jpeg') AS authorAvatarUrl
            FROM likes l
            JOIN follows f ON f.follower_id = l.user_id
                           AND f.following_id = :authorId
                           AND f.status = 'ACCEPTED'
            JOIN videos v ON v.id = l.video_id
            JOIN users u ON u.id = v.author_id
            WHERE v.status = 'READY'
              AND coalesce(v.privacy, 'PUBLIC') = 'PUBLIC'
              AND coalesce(v.studio_draft, false) = false
              AND (v.scheduled_at IS NULL OR v.scheduled_at <= now())
              AND v.author_id <> :authorId
              AND NOT EXISTS (
                  SELECT 1 FROM moderation_decisions md
                  WHERE md.video_id = v.id
                    AND md.explore_eligible = false
                    AND md.shadow = false
              )
            GROUP BY v.id, v.public_id, v.title, v.description, v.video_url, v.thumbnail_url,
                     v.master_playlist_url, v.share_count, v.created_at, v.explore_score,
                     u.id, u.username, u.display_name, u.avatar_url, u.google_avatar_url
            ORDER BY count(*) DESC, v.explore_score DESC, v.id DESC
            """,
        countQuery = """
            SELECT count(*) FROM (
                SELECT v.id
                FROM likes l
                JOIN follows f ON f.follower_id = l.user_id
                               AND f.following_id = :authorId
                               AND f.status = 'ACCEPTED'
                JOIN videos v ON v.id = l.video_id
                WHERE v.status = 'READY'
                  AND coalesce(v.privacy, 'PUBLIC') = 'PUBLIC'
                  AND coalesce(v.studio_draft, false) = false
                  AND (v.scheduled_at IS NULL OR v.scheduled_at <= now())
                  AND v.author_id <> :authorId
                  AND NOT EXISTS (
                      SELECT 1 FROM moderation_decisions md
                      WHERE md.video_id = v.id
                        AND md.explore_eligible = false
                        AND md.shadow = false
                  )
                GROUP BY v.id
            ) rows
            """,
        nativeQuery = true
    )
    Page<ExploreVideoProjection> findVideosLikedByFollowers(
        @Param("authorId") Long authorId,
        Pageable pageable
    );

    @Query(
        value = """
            SELECT v.id AS id, v.public_id AS publicId, v.title AS title, v.description AS description,
                   v.video_url AS videoUrl, v.thumbnail_url AS thumbnailUrl,
                   v.master_playlist_url AS masterPlaylistUrl, v.share_count AS shareCount,
                   v.created_at AS createdAt, v.explore_score AS exploreScore,
                   u.id AS authorId, u.username AS authorUsername, u.display_name AS authorDisplayName,
                   coalesce(nullif(trim(u.avatar_url), ''), nullif(trim(u.google_avatar_url), ''),
                            '/images/users/default-avatar.jpeg') AS authorAvatarUrl
            FROM studio_inspirations i
            JOIN videos v ON v.id = i.video_id
            JOIN users u ON u.id = v.author_id
            WHERE i.user_id = :userId
              AND v.status = 'READY'
              AND coalesce(v.privacy, 'PUBLIC') = 'PUBLIC'
              AND coalesce(v.studio_draft, false) = false
              AND (v.scheduled_at IS NULL OR v.scheduled_at <= now())
            ORDER BY i.created_at DESC
            """,
        countQuery = """
            SELECT count(*)
            FROM studio_inspirations i
            JOIN videos v ON v.id = i.video_id
            WHERE i.user_id = :userId
              AND v.status = 'READY'
              AND coalesce(v.privacy, 'PUBLIC') = 'PUBLIC'
              AND coalesce(v.studio_draft, false) = false
              AND (v.scheduled_at IS NULL OR v.scheduled_at <= now())
            """,
        nativeQuery = true
    )
    Page<ExploreVideoProjection> findSavedVideos(
        @Param("userId") Long userId,
        Pageable pageable
    );

    @Query(
        value = """
            SELECT
                u.id AS id,
                u.username AS username,
                u.display_name AS displayName,
                count(DISTINCT v.id) AS videoCount,
                (
                    SELECT count(*) FROM follows ff
                    WHERE ff.following_id = u.id AND ff.status = 'ACCEPTED'
                ) AS followerCount,
                (
                    SELECT v2.thumbnail_url FROM videos v2
                    WHERE v2.author_id = u.id
                      AND v2.status = 'READY'
                      AND coalesce(v2.studio_draft, false) = false
                      AND (v2.scheduled_at IS NULL OR v2.scheduled_at <= now())
                      AND v2.thumbnail_url IS NOT NULL AND trim(v2.thumbnail_url) <> ''
                    ORDER BY v2.explore_score DESC, v2.created_at DESC
                    LIMIT 1
                ) AS previewThumbnailUrl,
                (
                    SELECT v2.video_url FROM videos v2
                    WHERE v2.author_id = u.id
                      AND v2.status = 'READY'
                      AND coalesce(v2.studio_draft, false) = false
                      AND (v2.scheduled_at IS NULL OR v2.scheduled_at <= now())
                      AND v2.video_url IS NOT NULL AND trim(v2.video_url) <> ''
                    ORDER BY v2.explore_score DESC, v2.created_at DESC
                    LIMIT 1
                ) AS previewVideoUrl
            FROM users u
            JOIN videos v ON v.author_id = u.id AND v.status = 'READY'
              AND coalesce(v.privacy, 'PUBLIC') = 'PUBLIC'
              AND coalesce(v.studio_draft, false) = false
              AND (v.scheduled_at IS NULL OR v.scheduled_at <= now())
            WHERE u.id <> :viewerId
              AND (:filterRegion = FALSE OR u.account_region = :region)
            GROUP BY u.id, u.username, u.display_name
            HAVING count(DISTINCT v.id) >= 1
            ORDER BY followerCount DESC, max(v.explore_score) DESC, u.id DESC
            """,
        countQuery = """
            SELECT count(*) FROM (
                SELECT u.id
                FROM users u
                JOIN videos v ON v.author_id = u.id AND v.status = 'READY'
                  AND coalesce(v.privacy, 'PUBLIC') = 'PUBLIC'
                  AND coalesce(v.studio_draft, false) = false
                  AND (v.scheduled_at IS NULL OR v.scheduled_at <= now())
                WHERE u.id <> :viewerId
                  AND (:filterRegion = FALSE OR u.account_region = :region)
                GROUP BY u.id
                HAVING count(DISTINCT v.id) >= 1
            ) rows
            """,
        nativeQuery = true
    )
    Page<SuggestedCreatorProjection> findTrendingCreators(
        @Param("viewerId") Long viewerId,
        @Param("filterRegion") boolean filterRegion,
        @Param("region") String region,
        Pageable pageable
    );

    @Query(
        value = """
            SELECT
                u.id AS id,
                u.username AS username,
                u.display_name AS displayName,
                count(DISTINCT v.id) AS videoCount,
                (
                    SELECT count(*) FROM follows ff
                    WHERE ff.following_id = u.id AND ff.status = 'ACCEPTED'
                ) AS followerCount,
                (
                    SELECT v2.thumbnail_url FROM videos v2
                    WHERE v2.author_id = u.id
                      AND v2.status = 'READY'
                      AND coalesce(v2.studio_draft, false) = false
                      AND (v2.scheduled_at IS NULL OR v2.scheduled_at <= now())
                      AND v2.thumbnail_url IS NOT NULL AND trim(v2.thumbnail_url) <> ''
                    ORDER BY v2.explore_score DESC, v2.created_at DESC
                    LIMIT 1
                ) AS previewThumbnailUrl,
                (
                    SELECT v2.video_url FROM videos v2
                    WHERE v2.author_id = u.id
                      AND v2.status = 'READY'
                      AND coalesce(v2.studio_draft, false) = false
                      AND (v2.scheduled_at IS NULL OR v2.scheduled_at <= now())
                      AND v2.video_url IS NOT NULL AND trim(v2.video_url) <> ''
                    ORDER BY v2.explore_score DESC, v2.created_at DESC
                    LIMIT 1
                ) AS previewVideoUrl
            FROM users u
            JOIN videos v ON v.author_id = u.id AND v.status = 'READY'
              AND coalesce(v.privacy, 'PUBLIC') = 'PUBLIC'
              AND coalesce(v.studio_draft, false) = false
              AND (v.scheduled_at IS NULL OR v.scheduled_at <= now())
            WHERE u.id <> :viewerId
              AND EXISTS (
                  SELECT 1 FROM video_categories vc
                  WHERE vc.video_id = v.id
                    AND vc.score >= 1.5
                    AND vc.category_id IN (
                        SELECT vc2.category_id
                        FROM video_categories vc2
                        JOIN videos mine ON mine.id = vc2.video_id
                        WHERE mine.author_id = :viewerId
                          AND mine.status = 'READY'
                          AND coalesce(mine.studio_draft, false) = false
                    )
              )
            GROUP BY u.id, u.username, u.display_name
            HAVING count(DISTINCT v.id) >= 1
            ORDER BY followerCount DESC, max(v.explore_score) DESC, u.id DESC
            """,
        countQuery = """
            SELECT count(*) FROM (
                SELECT u.id
                FROM users u
                JOIN videos v ON v.author_id = u.id AND v.status = 'READY'
                  AND coalesce(v.privacy, 'PUBLIC') = 'PUBLIC'
                  AND coalesce(v.studio_draft, false) = false
                  AND (v.scheduled_at IS NULL OR v.scheduled_at <= now())
                WHERE u.id <> :viewerId
                  AND EXISTS (
                      SELECT 1 FROM video_categories vc
                      WHERE vc.video_id = v.id
                        AND vc.score >= 1.5
                        AND vc.category_id IN (
                            SELECT vc2.category_id
                            FROM video_categories vc2
                            JOIN videos mine ON mine.id = vc2.video_id
                            WHERE mine.author_id = :viewerId
                              AND mine.status = 'READY'
                              AND coalesce(mine.studio_draft, false) = false
                        )
                  )
                GROUP BY u.id
                HAVING count(DISTINCT v.id) >= 1
            ) rows
            """,
        nativeQuery = true
    )
    Page<SuggestedCreatorProjection> findSimilarCreators(
        @Param("viewerId") Long viewerId,
        Pageable pageable
    );
}
