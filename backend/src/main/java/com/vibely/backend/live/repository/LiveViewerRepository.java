package com.vibely.backend.live.repository;

import com.vibely.backend.live.entity.LiveViewer;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface LiveViewerRepository extends JpaRepository<LiveViewer, Long> {

    long countByLiveId(Long liveId);

    /** Signed-in viewers count once however many sessions they had. */
    @Query("select count(distinct v.userId) from LiveViewer v where v.liveId = :liveId and v.userId is not null")
    long countDistinctUsers(@Param("liveId") Long liveId);

    /** Guests have no account: each guest viewing session counts as one viewer. */
    @Query("select count(distinct v.sessionId) from LiveViewer v where v.liveId = :liveId and v.userId is null")
    long countGuestSessions(@Param("liveId") Long liveId);

    @Query("select coalesce(sum(v.watchDurationSeconds), 0) from LiveViewer v where v.liveId = :liveId")
    long sumWatchSeconds(@Param("liveId") Long liveId);
}
