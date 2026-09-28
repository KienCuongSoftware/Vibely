package com.vibely.backend.live.repository;

import com.vibely.backend.live.entity.LiveLike;
import java.time.LocalDateTime;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface LiveLikeRepository extends JpaRepository<LiveLike, Long> {

    Optional<LiveLike> findByLiveIdAndUserId(Long liveId, Long userId);

    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query("""
        update LiveLike l
        set l.likeCount = l.likeCount + :delta, l.updatedAt = :now
        where l.liveId = :liveId and l.userId = :userId
        """)
    int increment(
        @Param("liveId") Long liveId,
        @Param("userId") Long userId,
        @Param("delta") long delta,
        @Param("now") LocalDateTime now
    );
}
