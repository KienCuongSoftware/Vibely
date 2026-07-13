package com.vibely.backend.originality;

import org.springframework.data.jpa.repository.JpaRepository;

public interface OriginalityMatchRepository extends JpaRepository<OriginalityMatchEntity, Long> {

    void deleteByReport_Id(Long reportId);
}
