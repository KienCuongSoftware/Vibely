package com.vibely.backend.discovery.repository;

import com.vibely.backend.explore.ExploreVideoProjection;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.Repository;
import org.springframework.data.repository.query.Param;

public interface DiscoveryExploreQueryRepository extends Repository<com.vibely.backend.video.Video, Long> {

    String VIDEO_SELECT = """
            select v.id as id, v.public_id as publicId, v.title as title, v.description as description,
                   v.video_url as videoUrl, v.thumbnail_url as thumbnailUrl, v.master_playlist_url as masterPlaylistUrl,
                   v.share_count as shareCount,
                   v.created_at as createdAt,
                   coalesce(v.ranking_score, ves.ranking_score, v.explore_score) as exploreScore,
                   u.id as authorId, u.username as authorUsername, u.display_name as authorDisplayName,
                   coalesce(nullif(trim(u.google_avatar_url), ''), nullif(trim(u.avatar_url), ''), '/images/users/default-avatar.jpeg') as authorAvatarUrl
        """;

    String RANK_ORDER = """
            order by coalesce(v.ranking_score, ves.ranking_score, v.explore_score) desc,
                     v.created_at desc, v.id desc
        """;

    @Query(
        value = VIDEO_SELECT + """
            from videos v
            join users u on u.id = v.author_id
            left join video_engagement_stats ves on ves.video_id = v.id
            where v.status = 'READY'
              and (:cursorScore is null or (coalesce(v.ranking_score, ves.ranking_score, v.explore_score) < :cursorScore
                   or (coalesce(v.ranking_score, ves.ranking_score, v.explore_score) = :cursorScore and (v.created_at < :cursorTime
                   or (v.created_at = :cursorTime and v.id < :cursorId)))))
            """ + RANK_ORDER,
        nativeQuery = true
    )
    List<ExploreVideoProjection> findTrendingHybrid(
        @Param("cursorScore") Double cursorScore,
        @Param("cursorTime") LocalDateTime cursorTime,
        @Param("cursorId") Long cursorId,
        Pageable pageable
    );

    @Query(
        value = VIDEO_SELECT + """
            from videos v
            join users u on u.id = v.author_id
            left join video_engagement_stats ves on ves.video_id = v.id
            where v.status = 'READY'
              and v.id in (
                select primary_vc.video_id from (
                  select distinct on (vc.video_id) vc.video_id, vc.category_id
                  from video_categories vc
                  join categories c on c.id = vc.category_id
                  where c.slug <> 'all' and c.enabled = true and vc.score >= 1.0
                  order by vc.video_id, vc.score desc, vc.category_id asc
                ) primary_vc
                join categories c on c.id = primary_vc.category_id
                where c.slug = :slug and c.enabled = true
                union
                select vcs.video_id from video_category_scores vcs
                join categories c2 on c2.id = vcs.category_id
                where c2.slug = :slug and c2.enabled = true and vcs.score >= 0.35
                union
                select vt.video_id from video_topics vt
                join topic_category_mapping ctm on ctm.topic_id = vt.topic_id
                join categories c3 on c3.id = ctm.category_id
                where c3.slug = :slug and c3.enabled = true and vt.score >= 0.35
              )
              and (:cursorScore is null or (coalesce(v.ranking_score, ves.ranking_score, v.explore_score) < :cursorScore
                   or (coalesce(v.ranking_score, ves.ranking_score, v.explore_score) = :cursorScore and (v.created_at < :cursorTime
                   or (v.created_at = :cursorTime and v.id < :cursorId)))))
            """ + RANK_ORDER,
        nativeQuery = true
    )
    List<ExploreVideoProjection> findByCategorySlugHybrid(
        @Param("slug") String slug,
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
                   v.created_at as createdAt,
                   (vt_rank.score * 0.35
                     + coalesce(ves.ranking_score, v.ranking_score, v.explore_score, 0) / 100.0 * 0.55
                     + case when v.created_at >= :freshSince then 0.10 else 0 end
                   ) as exploreScore,
                   u.id as authorId, u.username as authorUsername, u.display_name as authorDisplayName,
                   coalesce(nullif(trim(u.google_avatar_url), ''), nullif(trim(u.avatar_url), ''), '/images/users/default-avatar.jpeg') as authorAvatarUrl
            from videos v
            join users u on u.id = v.author_id
            left join video_engagement_stats ves on ves.video_id = v.id
            join video_topics vt_rank on vt_rank.video_id = v.id
            join topics t_rank on t_rank.id = vt_rank.topic_id and t_rank.slug = :slug
            where v.status = 'READY'
              and vt_rank.score >= 0.25
              and (:cursorScore is null or (
                (vt_rank.score * 0.35
                  + coalesce(ves.ranking_score, v.ranking_score, v.explore_score, 0) / 100.0 * 0.55
                  + case when v.created_at >= :freshSince then 0.10 else 0 end
                ) < :cursorScore
                or (
                  (vt_rank.score * 0.35
                    + coalesce(ves.ranking_score, v.ranking_score, v.explore_score, 0) / 100.0 * 0.55
                    + case when v.created_at >= :freshSince then 0.10 else 0 end
                  ) = :cursorScore and (v.created_at < :cursorTime
                  or (v.created_at = :cursorTime and v.id < :cursorId))
                )
              ))
            order by exploreScore desc, v.created_at desc, v.id desc
            """,
        nativeQuery = true
    )
    List<ExploreVideoProjection> findByTopicSlugHybrid(
        @Param("slug") String slug,
        @Param("freshSince") LocalDateTime freshSince,
        @Param("cursorScore") Double cursorScore,
        @Param("cursorTime") LocalDateTime cursorTime,
        @Param("cursorId") Long cursorId,
        Pageable pageable
    );

    @Query(
        value = VIDEO_SELECT + """
            from videos v
            join users u on u.id = v.author_id
            left join video_engagement_stats ves on ves.video_id = v.id
            left join video_hashtags vh on vh.video_id = v.id
            left join hashtags h on h.id = vh.hashtag_id
            left join video_topics vt on vt.video_id = v.id
            left join topics t on t.id = vt.topic_id
            where v.status = 'READY'
              and (
                lower(coalesce(v.title,'')) like concat('%', lower(:q), '%')
                or lower(coalesce(v.description,'')) like concat('%', lower(:q), '%')
                or lower(coalesce(h.tag,'')) like concat('%', lower(:q), '%')
                or lower(coalesce(t.slug,'')) like concat('%', lower(:q), '%')
                or lower(coalesce(t.display_name,'')) like concat('%', lower(:q), '%')
              )
              and (:cursorScore is null or (coalesce(v.ranking_score, ves.ranking_score, v.explore_score) < :cursorScore
                   or (coalesce(v.ranking_score, ves.ranking_score, v.explore_score) = :cursorScore and (v.created_at < :cursorTime
                   or (v.created_at = :cursorTime and v.id < :cursorId)))))
            group by v.id, u.id, ves.ranking_score
            """ + RANK_ORDER,
        nativeQuery = true
    )
    List<ExploreVideoProjection> searchHybrid(
        @Param("q") String q,
        @Param("cursorScore") Double cursorScore,
        @Param("cursorTime") LocalDateTime cursorTime,
        @Param("cursorId") Long cursorId,
        Pageable pageable
    );

    @Query(
        value = """
            select v.id from videos v where v.public_id = :publicId and v.status = 'READY'
            """,
        nativeQuery = true
    )
    Long findVideoIdByPublicId(@Param("publicId") UUID publicId);

    @Query(
        value = VIDEO_SELECT + """
            from videos v
            join users u on u.id = v.author_id
            left join video_engagement_stats ves on ves.video_id = v.id
            where v.status = 'READY' and v.id in (:ids)
            """,
        nativeQuery = true
    )
    List<ExploreVideoProjection> findByVideoIds(@Param("ids") List<Long> ids);
}
