package com.vibely.backend.interaction;

import com.vibely.backend.user.User;
import java.util.Collection;
import java.time.LocalDateTime;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface FollowRepository extends JpaRepository<FollowEntity, Long> {
    boolean existsByFollowerAndFollowing(User follower, User following);
    void deleteByFollowerAndFollowing(User follower, User following);
    List<FollowEntity> findByFollower(User follower);

    long countByFollower_Id(Long followerId);

    long countByFollowing_Id(Long followingId);

    /** Số lượt follow nhận được bởi user (following) từ mốc thời gian trở đi. */
    long countByFollowing_IdAndCreatedAtGreaterThanEqual(Long followingId, LocalDateTime from);

    @Query(
        value = """
            select f from FollowEntity f
            join fetch f.following u
            where f.follower = :user
            order by f.createdAt desc
            """,
        countQuery = """
            select count(f) from FollowEntity f
            where f.follower = :user
            """
    )
    Page<FollowEntity> findFollowingPage(@Param("user") User user, Pageable pageable);

    @Query(
        value = """
            select f from FollowEntity f
            join fetch f.follower u
            where f.following = :user
            order by f.createdAt desc
            """,
        countQuery = """
            select count(f) from FollowEntity f
            where f.following = :user
            """
    )
    Page<FollowEntity> findFollowersPage(@Param("user") User user, Pageable pageable);

    @Query("""
        select f.following.id from FollowEntity f
        where f.follower.id = :followerId
        """)
    List<Long> findFollowingIds(@Param("followerId") Long followerId);

    @Query("""
        select f.following.id from FollowEntity f
        where f.follower.id = :followerId
        and f.following.id in :candidateIds
        """)
    List<Long> findFollowingIdsForFollower(
        @Param("followerId") Long followerId,
        @Param("candidateIds") Collection<Long> candidateIds
    );
}
