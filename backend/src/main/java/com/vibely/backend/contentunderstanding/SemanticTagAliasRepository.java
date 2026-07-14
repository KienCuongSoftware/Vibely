package com.vibely.backend.contentunderstanding;

import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface SemanticTagAliasRepository extends JpaRepository<SemanticTagAliasEntity, Long> {

    @Query("""
        select a from SemanticTagAliasEntity a
        join fetch a.tag
        where lower(a.alias) = lower(:alias)
        """)
    Optional<SemanticTagAliasEntity> findByAliasIgnoreCase(@Param("alias") String alias);
}
