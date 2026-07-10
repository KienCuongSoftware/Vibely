package com.vibely.backend.auth.repository;

import com.vibely.backend.auth.entity.BanAppeal;
import com.vibely.backend.auth.entity.BanAppealStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

public interface BanAppealRepository extends JpaRepository<BanAppeal, Long> {

    Page<BanAppeal> findAllByOrderByCreatedAtDesc(Pageable pageable);

    Page<BanAppeal> findByStatusOrderByCreatedAtDesc(BanAppealStatus status, Pageable pageable);
}
