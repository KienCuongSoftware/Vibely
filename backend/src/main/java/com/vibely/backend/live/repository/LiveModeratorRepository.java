package com.vibely.backend.live.repository;

import com.vibely.backend.live.entity.LiveModerator;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.transaction.annotation.Transactional;

public interface LiveModeratorRepository extends JpaRepository<LiveModerator, Long> {

    boolean existsByHostIdAndModerator_Id(Long hostId, Long moderatorId);

    @Query("""
        select m from LiveModerator m
        join fetch m.moderator
        where m.hostId = :hostId
        order by m.createdAt desc
        """)
    List<LiveModerator> findByHostIdWithModerator(@Param("hostId") Long hostId);

    @Modifying
    @Transactional
    @Query("delete from LiveModerator m where m.hostId = :hostId and m.moderator.id = :moderatorId")
    int deletePair(@Param("hostId") Long hostId, @Param("moderatorId") Long moderatorId);
}
