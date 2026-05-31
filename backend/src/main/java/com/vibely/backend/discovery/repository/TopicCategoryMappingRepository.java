package com.vibely.backend.discovery.repository;

import com.vibely.backend.discovery.model.TopicCategoryMapping;
import com.vibely.backend.discovery.model.TopicCategoryMappingId;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

public interface TopicCategoryMappingRepository extends JpaRepository<TopicCategoryMapping, TopicCategoryMappingId> {
    @Query(
        value = """
            select t.slug, c.slug, m.weight
            from topic_category_mapping m
            join topics t on t.id = m.topic_id
            join categories c on c.id = m.category_id
            where c.enabled = true
            """,
        nativeQuery = true
    )
    List<Object[]> findTopicCategoryWeights();
}
