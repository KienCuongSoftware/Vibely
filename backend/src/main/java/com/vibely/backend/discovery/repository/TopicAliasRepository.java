package com.vibely.backend.discovery.repository;

import com.vibely.backend.discovery.model.TopicAlias;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

public interface TopicAliasRepository extends JpaRepository<TopicAlias, String> {
    @Query(
        value = """
            select ta.alias, t.slug
            from topic_aliases ta
            join topics t on t.id = ta.canonical_topic_id
            """,
        nativeQuery = true
    )
    java.util.List<Object[]> findAllAliasSlugPairs();

    @Query(
        value = """
            select t.slug
            from topic_aliases ta
            join topics t on t.id = ta.canonical_topic_id
            where ta.alias = :alias
            limit 1
            """,
        nativeQuery = true
    )
    Optional<String> findCanonicalSlugByAlias(String alias);
}
