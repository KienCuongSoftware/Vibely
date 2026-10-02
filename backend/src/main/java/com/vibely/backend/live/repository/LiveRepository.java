package com.vibely.backend.live.repository;

import com.vibely.backend.live.entity.Live;
import com.vibely.backend.live.entity.LiveCategory;
import com.vibely.backend.live.entity.LiveStatus;
import java.time.LocalDateTime;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Slice;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.transaction.annotation.Transactional;

public interface LiveRepository extends JpaRepository<Live, Long> {

    @Query("select l from Live l join fetch l.host where l.publicId = :publicId")
    Optional<Live> findWithHostByPublicId(@Param("publicId") UUID publicId);

    @Query("select l from Live l join fetch l.host where l.id = :id")
    Optional<Live> findWithHostById(@Param("id") Long id);

    @Query("select l.publicId from Live l where l.id = :id")
    Optional<UUID> findPublicIdById(@Param("id") Long id);

    boolean existsByHost_IdAndStatus(Long hostId, LiveStatus status);

    @Query("select l.id from Live l where l.status = :status")
    List<Long> findIdsByStatus(@Param("status") LiveStatus status);

    /** CREATED -> LIVE; returns 0 when another request already moved the LIVE out of CREATED. */
    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Transactional
    @Query("""
        update Live l
        set l.status = com.vibely.backend.live.entity.LiveStatus.LIVE,
            l.startedAt = :now,
            l.updatedAt = :now,
            l.version = l.version + 1
        where l.id = :id and l.status = com.vibely.backend.live.entity.LiveStatus.CREATED
        """)
    int markLive(@Param("id") Long id, @Param("now") LocalDateTime now);

    /** LIVE -> ENDED with final statistics; returns 0 when the LIVE is no longer LIVE. */
    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Transactional
    @Query("""
        update Live l
        set l.status = com.vibely.backend.live.entity.LiveStatus.ENDED,
            l.endedAt = :now,
            l.updatedAt = :now,
            l.viewerCount = 0,
            l.peakViewerCount = case when l.peakViewerCount < :peak then :peak else l.peakViewerCount end,
            l.likeCount = case when l.likeCount < :likes then :likes else l.likeCount end,
            l.version = l.version + 1
        where l.id = :id and l.status = com.vibely.backend.live.entity.LiveStatus.LIVE
        """)
    int markEnded(
        @Param("id") Long id,
        @Param("now") LocalDateTime now,
        @Param("peak") long peak,
        @Param("likes") long likes
    );

    /** CREATED -> CANCELLED; returns 0 when the LIVE already started or finished. */
    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Transactional
    @Query("""
        update Live l
        set l.status = com.vibely.backend.live.entity.LiveStatus.CANCELLED,
            l.endedAt = :now,
            l.updatedAt = :now,
            l.version = l.version + 1
        where l.id = :id and l.status = com.vibely.backend.live.entity.LiveStatus.CREATED
        """)
    int markCancelled(@Param("id") Long id, @Param("now") LocalDateTime now);

    /** Periodic snapshot of realtime counters; peak and likes never move backwards. */
    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Transactional
    @Query("""
        update Live l
        set l.viewerCount = :viewers,
            l.peakViewerCount = case when l.peakViewerCount < :peak then :peak else l.peakViewerCount end,
            l.likeCount = case when l.likeCount < :likes then :likes else l.likeCount end
        where l.id = :id and l.status = com.vibely.backend.live.entity.LiveStatus.LIVE
        """)
    int updateRealtimeStats(
        @Param("id") Long id,
        @Param("viewers") long viewers,
        @Param("peak") long peak,
        @Param("likes") long likes
    );

    /**
     * Discovery: LIVEs of active hosts that the viewer may see. PUBLIC is visible to everyone,
     * FOLLOWERS to accepted followers, FRIENDS to mutual followers; the host always sees their own.
     */
    @Query(
        value = """
            select l from Live l
            join fetch l.host h
            where l.status = :status
              and l.category in :categories
              and h.accountStatus = com.vibely.backend.user.entity.UserAccountStatus.ACTIVE
              and (:search is null
                   or lower(l.title) like :search escape '\\'
                   or lower(h.username) like :search escape '\\'
                   or lower(h.displayName) like :search escape '\\')
              and (
                   l.visibility = com.vibely.backend.live.entity.LiveVisibility.PUBLIC
                   or h.id = :viewerId
                   or (l.visibility = com.vibely.backend.live.entity.LiveVisibility.FOLLOWERS
                       and exists (select 1 from FollowEntity f
                                   where f.follower.id = :viewerId and f.following = h
                                     and f.status = com.vibely.backend.interaction.entity.FollowStatus.ACCEPTED))
                   or (l.visibility = com.vibely.backend.live.entity.LiveVisibility.FRIENDS
                       and exists (select 1 from FollowEntity f
                                   where f.follower.id = :viewerId and f.following = h
                                     and f.status = com.vibely.backend.interaction.entity.FollowStatus.ACCEPTED)
                       and exists (select 1 from FollowEntity f
                                   where f.follower = h and f.following.id = :viewerId
                                     and f.status = com.vibely.backend.interaction.entity.FollowStatus.ACCEPTED))
              )
              and (:followingOnly = false
                   or exists (select 1 from FollowEntity f
                              where f.follower.id = :viewerId and f.following = h
                                and f.status = com.vibely.backend.interaction.entity.FollowStatus.ACCEPTED))
            """
    )
    Slice<Live> findDiscoverable(
        @Param("status") LiveStatus status,
        @Param("categories") Collection<LiveCategory> categories,
        @Param("search") String search,
        @Param("viewerId") Long viewerId,
        @Param("followingOnly") boolean followingOnly,
        Pageable pageable
    );
}
