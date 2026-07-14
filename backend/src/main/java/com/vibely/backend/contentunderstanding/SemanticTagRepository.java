package com.vibely.backend.contentunderstanding;

import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface SemanticTagRepository extends JpaRepository<SemanticTagEntity, Long> {

    Optional<SemanticTagEntity> findBySlugIgnoreCase(String slug);

    List<SemanticTagEntity> findByStatus(String status);
}
