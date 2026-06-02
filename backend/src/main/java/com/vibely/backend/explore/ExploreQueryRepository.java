package com.vibely.backend.explore;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.Repository;
import org.springframework.data.repository.query.Param;

public interface ExploreQueryRepository extends Repository<com.vibely.backend.video.Video, Long> {

    @Query(
        value = """
            select v.id as id, v.public_id as publicId, v.title as title, v.description as description,
                   v.video_url as videoUrl, v.thumbnail_url as thumbnailUrl, v.master_playlist_url as masterPlaylistUrl,
                   v.share_count as shareCount,
                   v.created_at as createdAt, v.explore_score as exploreScore,
                   u.id as authorId, u.username as authorUsername, u.display_name as authorDisplayName,
                   coalesce(nullif(trim(u.google_avatar_url), ''), nullif(trim(u.avatar_url), ''), '/images/users/default-avatar.jpeg') as authorAvatarUrl
            from videos v
            join users u on u.id = v.author_id
            where v.status = 'READY'
              and (:cursorScore is null or (v.explore_score < :cursorScore
                   or (v.explore_score = :cursorScore and (v.created_at < :cursorTime
                   or (v.created_at = :cursorTime and v.id < :cursorId)))))
            order by v.explore_score desc, v.created_at desc, v.id desc
            """,
        nativeQuery = true
    )
    List<ExploreVideoProjection> findTrending(
        @Param("cursorScore") Double cursorScore,
        @Param("cursorTime") LocalDateTime cursorTime,
        @Param("cursorId") Long cursorId,
        Pageable pageable
    );

    @Query(
        value = """
            select v.id as id, v.public_id as publicId, v.title as title, v.description as description,
                   v.video_url as videoUrl, v.thumbnail_url as thumbnailUrl, v.master_playlist_url as masterPlaylistUrl,
                   v.share_count as shareCount,
                   v.created_at as createdAt, v.explore_score as exploreScore,
                   u.id as authorId, u.username as authorUsername, u.display_name as authorDisplayName,
                   coalesce(nullif(trim(u.google_avatar_url), ''), nullif(trim(u.avatar_url), ''), '/images/users/default-avatar.jpeg') as authorAvatarUrl
            from videos v
            join users u on u.id = v.author_id
            join video_categories vc on vc.video_id = v.id
            join categories c on c.id = vc.category_id
            where v.status = 'READY'
              and c.slug = :slug
              and c.enabled = true
              and (:cursorScore is null or (v.explore_score < :cursorScore
                   or (v.explore_score = :cursorScore and (v.created_at < :cursorTime
                   or (v.created_at = :cursorTime and v.id < :cursorId)))))
            order by v.explore_score desc, v.created_at desc, v.id desc
            """,
        nativeQuery = true
    )
    List<ExploreVideoProjection> findByCategorySlug(
        @Param("slug") String slug,
        @Param("cursorScore") Double cursorScore,
        @Param("cursorTime") LocalDateTime cursorTime,
        @Param("cursorId") Long cursorId,
        Pageable pageable
    );

    @Query(
        value = """
            select distinct v.id as id, v.public_id as publicId, v.title as title, v.description as description,
                   v.video_url as videoUrl, v.thumbnail_url as thumbnailUrl, v.master_playlist_url as masterPlaylistUrl,
                   v.share_count as shareCount,
                   v.created_at as createdAt, v.explore_score as exploreScore,
                   u.id as authorId, u.username as authorUsername, u.display_name as authorDisplayName,
                   coalesce(nullif(trim(u.google_avatar_url), ''), nullif(trim(u.avatar_url), ''), '/images/users/default-avatar.jpeg') as authorAvatarUrl
            from videos v
            join users u on u.id = v.author_id
            left join video_hashtags vh on vh.video_id = v.id
            left join hashtags h on h.id = vh.hashtag_id
            where v.status = 'READY'
              and (
                lower(coalesce(v.title,'')) like concat('%', lower(:q), '%')
                or lower(coalesce(v.description,'')) like concat('%', lower(:q), '%')
                or lower(coalesce(h.tag,'')) like concat('%', lower(:q), '%')
              )
              and (:cursorScore is null or (v.explore_score < :cursorScore
                   or (v.explore_score = :cursorScore and (v.created_at < :cursorTime
                   or (v.created_at = :cursorTime and v.id < :cursorId)))))
            order by v.explore_score desc, v.created_at desc, v.id desc
            """,
        nativeQuery = true
    )
    List<ExploreVideoProjection> search(
        @Param("q") String q,
        @Param("cursorScore") Double cursorScore,
        @Param("cursorTime") LocalDateTime cursorTime,
        @Param("cursorId") Long cursorId,
        Pageable pageable
    );

    @Query(
        value = """
            select distinct v2.id as id, v2.public_id as publicId, v2.title as title, v2.description as description,
                   v2.video_url as videoUrl, v2.thumbnail_url as thumbnailUrl, v2.master_playlist_url as masterPlaylistUrl,
                   v2.share_count as shareCount,
                   v2.created_at as createdAt, v2.explore_score as exploreScore,
                   u.id as authorId, u.username as authorUsername, u.display_name as authorDisplayName,
                   coalesce(nullif(trim(u.google_avatar_url), ''), nullif(trim(u.avatar_url), ''), '/images/users/default-avatar.jpeg') as authorAvatarUrl
            from videos v1
            join videos v2 on true
            join users u on u.id = v2.author_id
            left join video_categories vc1 on vc1.video_id = v1.id
            left join video_categories vc2 on vc2.category_id = vc1.category_id and vc2.video_id = v2.id
            left join video_hashtags vh1 on vh1.video_id = v1.id
            left join video_hashtags vh2 on vh2.hashtag_id = vh1.hashtag_id and vh2.video_id = v2.id
            where v1.public_id = :publicId
              and v2.status = 'READY'
              and v2.id <> v1.id
              and (vc2.video_id is not null or vh2.video_id is not null)
            order by v2.explore_score desc, v2.created_at desc, v2.id desc
            """,
        nativeQuery = true
    )
    List<ExploreVideoProjection> related(@Param("publicId") UUID publicId, Pageable pageable);
}
