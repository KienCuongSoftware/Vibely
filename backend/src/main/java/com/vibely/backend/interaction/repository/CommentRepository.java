package com.vibely.backend.interaction.repository;

import com.vibely.backend.interaction.entity.CommentEntity;
import com.vibely.backend.studio.DailyCountProjection;
import com.vibely.backend.video.Video;
import com.vibely.backend.video.VideoStatus;
import java.time.LocalDateTime;
import java.util.Collection;
import java.util.List;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface CommentRepository extends JpaRepository<CommentEntity, Long> {
    List<CommentEntity> findByVideoOrderByCreatedAtDesc(Video video);
    long countByVideo(Video video);
    long countByVideoId(Long videoId);

    @Query("SELECT c.video.id, COUNT(c) FROM CommentEntity c WHERE c.video.id IN :ids GROUP BY c.video.id")
    List<Object[]> countGroupedByVideoIds(@Param("ids") Collection<Long> ids);

    @Query("""
        SELECT c.video.id, COUNT(c) FROM CommentEntity c
        WHERE c.video.id IN :ids AND c.createdAt >= :from
        GROUP BY c.video.id
        """)
    List<Object[]> countGroupedByVideoIdsSince(
        @Param("ids") Collection<Long> ids,
        @Param("from") LocalDateTime from
    );

    @Query("""
        select count(c) from CommentEntity c
        where c.video.author.id = :authorId
          and c.video.status in :statuses
          and c.createdAt >= :from
        """)
    long countCommentsForAuthorVideoStatusesSince(
        @Param("authorId") Long authorId,
        @Param("statuses") List<VideoStatus> statuses,
        @Param("from") LocalDateTime from
    );

    @Query("""
        select cast(c.createdAt as date) as day, count(c.id) as total
        from CommentEntity c
        where c.video.author.id = :authorId
          and c.video.status in :statuses
          and c.createdAt >= :from
        group by cast(c.createdAt as date)
        order by cast(c.createdAt as date)
        """)
    List<DailyCountProjection> countDailyCommentsForAuthorVideoStatusesSince(
        @Param("authorId") Long authorId,
        @Param("statuses") List<VideoStatus> statuses,
        @Param("from") LocalDateTime from
    );

    @Query("""
        select count(c) from CommentEntity c
        where c.video.id = :videoId and c.createdAt >= :from
        """)
    long countCommentsForVideoSince(@Param("videoId") Long videoId, @Param("from") LocalDateTime from);

    @Query("""
        select cast(c.createdAt as date) as day, count(c.id) as total
        from CommentEntity c
        where c.video.id = :videoId and c.createdAt >= :from
        group by cast(c.createdAt as date)
        order by cast(c.createdAt as date)
        """)
    List<DailyCountProjection> countDailyCommentsForVideoSince(
        @Param("videoId") Long videoId,
        @Param("from") LocalDateTime from
    );

    @Query("""
        select c
        from CommentEntity c
        where c.video.author.id = :authorId and c.video.status in :statuses
        order by c.createdAt desc
        """)
    List<CommentEntity> findLatestByAuthorIdAndVideoStatusIn(
        @Param("authorId") Long authorId,
        @Param("statuses") List<VideoStatus> statuses,
        Pageable pageable
    );

    /**
     * Bình luận trên mọi video của kênh, có tìm kiếm và lọc (trang Studio → Bình luận).
     * Tham số luôn khác null để Postgres không phải suy luận kiểu cho tham số null.
     */
    @Query(
        value = """
            select c from CommentEntity c
            join fetch c.user u
            join fetch c.video v
            left join fetch c.parentComment p
            left join fetch p.user pu
            where v.author.id = :authorId
              and v.status in :statuses
              and (
                :query = ''
                or lower(c.content) like lower(concat('%', :query, '%'))
                or lower(u.username) like lower(concat('%', :query, '%'))
                or lower(u.displayName) like lower(concat('%', :query, '%'))
              )
              and (
                :postedBy = 'all'
                or (:postedBy = 'me' and u.id = :authorId)
                or (:postedBy = 'others' and u.id <> :authorId)
              )
              and (
                :minFollowers <= 0
                or (
                  select count(f.id) from FollowEntity f
                  where f.following.id = u.id
                    and f.status = com.vibely.backend.interaction.entity.FollowStatus.ACCEPTED
                ) >= :minFollowers
              )
              and (
                :onlyUnreplied = false
                or (
                  u.id <> :authorId
                  and not exists (
                    select r.id from CommentEntity r
                    where r.parentComment.id = c.id and r.user.id = :authorId
                  )
                )
              )
            """,
        countQuery = """
            select count(c) from CommentEntity c
            join c.user u
            join c.video v
            where v.author.id = :authorId
              and v.status in :statuses
              and (
                :query = ''
                or lower(c.content) like lower(concat('%', :query, '%'))
                or lower(u.username) like lower(concat('%', :query, '%'))
                or lower(u.displayName) like lower(concat('%', :query, '%'))
              )
              and (
                :postedBy = 'all'
                or (:postedBy = 'me' and u.id = :authorId)
                or (:postedBy = 'others' and u.id <> :authorId)
              )
              and (
                :minFollowers <= 0
                or (
                  select count(f.id) from FollowEntity f
                  where f.following.id = u.id
                    and f.status = com.vibely.backend.interaction.entity.FollowStatus.ACCEPTED
                ) >= :minFollowers
              )
              and (
                :onlyUnreplied = false
                or (
                  u.id <> :authorId
                  and not exists (
                    select r.id from CommentEntity r
                    where r.parentComment.id = c.id and r.user.id = :authorId
                  )
                )
              )
            """
    )
    Page<CommentEntity> searchChannelComments(
        @Param("authorId") Long authorId,
        @Param("statuses") List<VideoStatus> statuses,
        @Param("query") String query,
        @Param("postedBy") String postedBy,
        @Param("minFollowers") long minFollowers,
        @Param("onlyUnreplied") boolean onlyUnreplied,
        Pageable pageable
    );

    @Query("""
        select c.parentComment.id, count(c) from CommentEntity c
        where c.parentComment.id in :ids
        group by c.parentComment.id
        """)
    List<Object[]> countRepliesGroupedByParentIds(@Param("ids") Collection<Long> ids);

    @Query("""
        select distinct c.parentComment.id from CommentEntity c
        where c.parentComment.id in :ids and c.user.id = :userId
        """)
    List<Long> findParentIdsRepliedByUser(
        @Param("ids") Collection<Long> ids,
        @Param("userId") Long userId
    );
}
