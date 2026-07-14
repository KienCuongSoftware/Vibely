package com.vibely.backend.contentunderstanding;

import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

public interface CuEventOutboxRepository extends JpaRepository<CuEventOutboxEntity, Long> {

    @Query("""
        select e from CuEventOutboxEntity e
        where e.publishedAt is null
        order by e.createdAt asc
        """)
    List<CuEventOutboxEntity> findUnpublished(org.springframework.data.domain.Pageable pageable);
}
