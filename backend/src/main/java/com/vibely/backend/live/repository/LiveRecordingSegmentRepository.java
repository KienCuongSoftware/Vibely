package com.vibely.backend.live.repository;

import com.vibely.backend.live.entity.LiveRecordingSegment;
import com.vibely.backend.live.entity.LiveRecordingStatus;
import java.util.Collection;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface LiveRecordingSegmentRepository extends JpaRepository<LiveRecordingSegment, Long> {

    List<LiveRecordingSegment> findByRecordingIdOrderByIdAsc(Long recordingId);

    boolean existsByFilePath(String filePath);

    /** Files still needed by a recording that has not been uploaded yet (never deleted by cleanup). */
    @Query("""
        select s.filePath from LiveRecordingSegment s, LiveRecording r
        where s.recordingId = r.id
          and r.status in :statuses
          and r.videoId is null
        """)
    List<String> findPendingFilePaths(@Param("statuses") Collection<LiveRecordingStatus> statuses);
}
