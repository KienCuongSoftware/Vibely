package com.vibely.backend.interaction.repository;

import com.vibely.backend.interaction.entity.FollowEntity;
import com.vibely.backend.interaction.entity.FollowStatus;
import com.vibely.backend.studio.DailyCountProjection;
import com.vibely.backend.studio.GroupCountProjection;
import com.vibely.backend.user.entity.User;
import java.util.Collection;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface FollowRepository extends JpaRepository<FollowEntity, Long> {
    Optional<FollowEntity> findByFollowerAndFollowing(User follower, User following);

    @Query("""
        select count(f) > 0 from FollowEntity f
        where f.follower = :follower and f.following = :following
        """)
    boolean existsByFollowerAndFollowing(@Param("follower") User follower, @Param("following") User following);

    @Query("""
        select count(f) > 0 from FollowEntity f
        where f.follower = :follower and f.following = :following and f.status = com.vibely.backend.interaction.entity.FollowStatus.ACCEPTED
        """)
    boolean existsAcceptedByFollowerAndFollowing(@Param("follower") User follower, @Param("following") User following);

    @Query("""
        select count(f) > 0 from FollowEntity f
        where f.follower = :follower and f.following = :following and f.status = com.vibely.backend.interaction.entity.FollowStatus.PENDING
        """)
    boolean existsPendingByFollowerAndFollowing(@Param("follower") User follower, @Param("following") User following);

    void deleteByFollowerAndFollowing(User follower, User following);

    List<FollowEntity> findByFollower(User follower);

    @Query("""
        select count(f) from FollowEntity f
        where f.follower.id = :followerId and f.status = com.vibely.backend.interaction.entity.FollowStatus.ACCEPTED
        """)
    long countByFollower_Id(@Param("followerId") Long followerId);

    @Query("""
        select count(f) from FollowEntity f
        where f.following.id = :followingId and f.status = com.vibely.backend.interaction.entity.FollowStatus.ACCEPTED
        """)
    long countByFollowing_Id(@Param("followingId") Long followingId);

    /** Số lượt follow nhận được bởi user (following) từ mốc thời gian trở đi. */
    @Query("""
        select count(f) from FollowEntity f
        where f.following.id = :followingId
        and f.status = com.vibely.backend.interaction.entity.FollowStatus.ACCEPTED
        and f.createdAt >= :from
        """)
    long countByFollowing_IdAndCreatedAtGreaterThanEqual(
        @Param("followingId") Long followingId,
        @Param("from") LocalDateTime from
    );

    /** Lượt follow mới theo từng ngày (dựng biểu đồ tăng trưởng trong Studio). */
    @Query("""
        select cast(f.createdAt as date) as day, count(f.id) as total from FollowEntity f
        where f.following.id = :followingId
        and f.status = com.vibely.backend.interaction.entity.FollowStatus.ACCEPTED
        and f.createdAt >= :from
        group by cast(f.createdAt as date)
        order by cast(f.createdAt as date)
        """)
    List<DailyCountProjection> countDailyNewFollowersSince(
        @Param("followingId") Long followingId,
        @Param("from") LocalDateTime from
    );

    /** Số người theo dõi của nhiều tài khoản cùng lúc (hiển thị cạnh tên người bình luận). */
    @Query("""
        select f.following.id, count(f.id) from FollowEntity f
        where f.following.id in :userIds
        and f.status = com.vibely.backend.interaction.entity.FollowStatus.ACCEPTED
        group by f.following.id
        """)
    List<Object[]> countFollowersGroupedByUserIds(@Param("userIds") Collection<Long> userIds);

    /** Người theo dõi nhóm theo khu vực tài khoản. */
    @Query("""
        select coalesce(f.follower.accountRegion, 'other') as groupKey, count(f.id) as total
        from FollowEntity f
        where f.following.id = :followingId
        and f.status = com.vibely.backend.interaction.entity.FollowStatus.ACCEPTED
        group by coalesce(f.follower.accountRegion, 'other')
        order by count(f.id) desc
        """)
    List<GroupCountProjection> countFollowersByRegion(@Param("followingId") Long followingId);

    /** Ngày sinh của người theo dõi để chia nhóm độ tuổi (chia nhóm ở tầng service). */
    @Query("""
        select f.follower.birthDate from FollowEntity f
        where f.following.id = :followingId
        and f.status = com.vibely.backend.interaction.entity.FollowStatus.ACCEPTED
        and f.follower.birthDate is not null
        """)
    List<LocalDate> findFollowerBirthDates(@Param("followingId") Long followingId, Pageable pageable);

    @Query(
        value = """
            select f from FollowEntity f
            join fetch f.following u
            where f.follower = :user and f.status = com.vibely.backend.interaction.entity.FollowStatus.ACCEPTED
            order by f.createdAt desc
            """,
        countQuery = """
            select count(f) from FollowEntity f
            where f.follower = :user and f.status = com.vibely.backend.interaction.entity.FollowStatus.ACCEPTED
            """
    )
    Page<FollowEntity> findFollowingPage(@Param("user") User user, Pageable pageable);

    @Query(
        value = """
            select f from FollowEntity f
            join fetch f.follower u
            where f.following = :user and f.status = com.vibely.backend.interaction.entity.FollowStatus.ACCEPTED
            order by f.createdAt desc
            """,
        countQuery = """
            select count(f) from FollowEntity f
            where f.following = :user and f.status = com.vibely.backend.interaction.entity.FollowStatus.ACCEPTED
            """
    )
    Page<FollowEntity> findFollowersPage(@Param("user") User user, Pageable pageable);

    @Query("""
        select f.following.id from FollowEntity f
        where f.follower.id = :followerId
        and f.status = com.vibely.backend.interaction.entity.FollowStatus.ACCEPTED
        """)
    List<Long> findFollowingIds(@Param("followerId") Long followerId);

    @Query("""
        select f.following.id from FollowEntity f
        where f.follower.id = :followerId
        and f.following.id in :candidateIds
        and f.status = com.vibely.backend.interaction.entity.FollowStatus.ACCEPTED
        """)
    List<Long> findFollowingIdsForFollower(
        @Param("followerId") Long followerId,
        @Param("candidateIds") Collection<Long> candidateIds
    );

    /** Authors (candidates) who follow the viewer (ACCEPTED). */
    @Query("""
        select f.follower.id from FollowEntity f
        where f.following.id = :viewerId
        and f.follower.id in :candidateIds
        and f.status = com.vibely.backend.interaction.entity.FollowStatus.ACCEPTED
        """)
    List<Long> findFollowerIdsAmong(
        @Param("viewerId") Long viewerId,
        @Param("candidateIds") Collection<Long> candidateIds
    );
}
