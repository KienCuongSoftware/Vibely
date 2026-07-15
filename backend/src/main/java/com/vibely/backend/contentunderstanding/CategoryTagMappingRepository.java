package com.vibely.backend.contentunderstanding;

import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface CategoryTagMappingRepository extends JpaRepository<CategoryTagMappingEntity, Long> {

    List<CategoryTagMappingEntity> findAllByOrderByPriorityAscIdAsc();

    Optional<CategoryTagMappingEntity> findByCategoryIdAndTagId(Long categoryId, Long tagId);

    boolean existsByCategoryIdAndTagId(Long categoryId, Long tagId);
}
