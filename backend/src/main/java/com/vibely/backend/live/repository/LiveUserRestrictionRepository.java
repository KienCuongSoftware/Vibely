package com.vibely.backend.live.repository;

import com.vibely.backend.live.entity.LiveRestrictionType;
import com.vibely.backend.live.entity.LiveUserRestriction;
import java.time.LocalDateTime;
import java.util.Collection;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.transaction.annotation.Transactional;

public interface LiveUserRestrictionRepository extends JpaRepository<LiveUserRestriction, Long> {

    Optional<LiveUserRestriction> findByLiveIdAndUserIdAndType(Long liveId, Long userId, LiveRestrictionType type);

    @Query("""
        select count(r) > 0 from LiveUserRestriction r
        where r.liveId = :liveId and r.userId = :userId and r.type in :types
          and (r.expiresAt is null or r.expiresAt > :now)
        """)
    boolean existsActive(
        @Param("liveId") Long liveId,
        @Param("userId") Long userId,
        @Param("types") Collection<LiveRestrictionType> types,
        @Param("now") LocalDateTime now
    );

    @Modifying
    @Transactional
    @Query("delete from LiveUserRestriction r where r.liveId = :liveId and r.userId = :userId and r.type = :type")
    int deleteRestriction(
        @Param("liveId") Long liveId,
        @Param("userId") Long userId,
        @Param("type") LiveRestrictionType type
    );
}
