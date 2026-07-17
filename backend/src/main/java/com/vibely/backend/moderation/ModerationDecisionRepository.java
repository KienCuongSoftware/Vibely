package com.vibely.backend.moderation;

import java.util.Collection;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface ModerationDecisionRepository extends JpaRepository<ModerationDecisionEntity, Long> {
    Optional<ModerationDecisionEntity> findByVideo_Id(Long videoId);

    @Query("""
        select d.video.id, d.reviewRequired
        from ModerationDecisionEntity d
        where d.video.id in :ids
        """)
    java.util.List<Object[]> findReviewRequiredFlags(@Param("ids") Collection<Long> ids);
}
