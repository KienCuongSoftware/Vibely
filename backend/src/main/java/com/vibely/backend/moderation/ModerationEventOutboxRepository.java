package com.vibely.backend.moderation;

import java.util.List;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

public interface ModerationEventOutboxRepository extends JpaRepository<ModerationEventOutboxEntity, Long> {

    @Query(
        """
        select e from ModerationEventOutboxEntity e
        where e.publishedAt is null
        order by e.createdAt asc
        """
    )
    List<ModerationEventOutboxEntity> findUnpublished(Pageable pageable);
}
