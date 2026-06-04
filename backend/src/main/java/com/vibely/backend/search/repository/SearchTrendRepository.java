package com.vibely.backend.search.repository;

import com.vibely.backend.search.entity.SearchTrend;
import java.util.List;
import java.util.Optional;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

public interface SearchTrendRepository extends JpaRepository<SearchTrend, Long> {

    Optional<SearchTrend> findByKeyword(String keyword);

    List<SearchTrend> findAllByOrderBySearchCountDescLastSearchedAtDesc(Pageable pageable);

    List<SearchTrend> findByKeywordContainingIgnoreCaseOrderBySearchCountDescLastSearchedAtDesc(
        String keyword,
        Pageable pageable
    );
}
