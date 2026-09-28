package com.vibely.backend.live.repository;

import com.vibely.backend.live.entity.LiveViewer;
import org.springframework.data.jpa.repository.JpaRepository;

public interface LiveViewerRepository extends JpaRepository<LiveViewer, Long> {

    long countByLiveId(Long liveId);
}
