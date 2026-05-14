package com.vibely.backend.interaction;

import com.vibely.backend.user.User;
import java.time.LocalDateTime;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface FollowRepository extends JpaRepository<FollowEntity, Long> {
    boolean existsByFollowerAndFollowing(User follower, User following);
    void deleteByFollowerAndFollowing(User follower, User following);
    List<FollowEntity> findByFollower(User follower);

    long countByFollower_Id(Long followerId);

    long countByFollowing_Id(Long followingId);

    /** Số lượt follow nhận được bởi user (following) từ mốc thời gian trở đi. */
    long countByFollowing_IdAndCreatedAtGreaterThanEqual(Long followingId, LocalDateTime from);
}
