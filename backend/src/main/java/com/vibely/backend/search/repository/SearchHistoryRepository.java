package com.vibely.backend.search.repository;

import com.vibely.backend.search.entity.SearchHistory;
import java.util.List;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface SearchHistoryRepository extends JpaRepository<SearchHistory, Long> {

    List<SearchHistory> findByUser_IdOrderByCreatedAtDesc(Long userId, Pageable pageable);

    long countByUser_Id(Long userId);

    @Modifying
    @Query("DELETE FROM SearchHistory h WHERE h.user.id = :userId")
    void deleteAllByUserId(@Param("userId") Long userId);

    List<SearchHistory> findByUser_IdOrderByCreatedAtAsc(Long userId, Pageable pageable);
}
