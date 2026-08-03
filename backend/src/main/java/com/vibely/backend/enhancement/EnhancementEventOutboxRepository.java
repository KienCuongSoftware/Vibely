package com.vibely.backend.enhancement;

import java.util.List;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

public interface EnhancementEventOutboxRepository extends JpaRepository<EnhancementEventOutboxEntity, Long> {

    @Query("""
        SELECT e FROM EnhancementEventOutboxEntity e
        WHERE e.publishedAt IS NULL
        ORDER BY e.id ASC
        """)
    List<EnhancementEventOutboxEntity> findUnpublished(Pageable pageable);
}
