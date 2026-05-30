package com.vibely.backend.discovery.repository;

import com.vibely.backend.discovery.model.Topic;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface TopicRepository extends JpaRepository<Topic, Long> {
    Optional<Topic> findBySlug(String slug);

    List<Topic> findBySlugIn(Collection<String> slugs);

    List<Topic> findTop50BySlugContainingIgnoreCaseOrDisplayNameContainingIgnoreCase(String slug, String displayName);
}
