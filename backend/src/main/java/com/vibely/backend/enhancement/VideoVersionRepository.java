package com.vibely.backend.enhancement;

import java.util.Collection;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface VideoVersionRepository extends JpaRepository<VideoVersionEntity, Long> {

    List<VideoVersionEntity> findByVideo_IdAndStatusOrderByCreatedAtDesc(
        Long videoId,
        VideoVersionStatus status
    );

    List<VideoVersionEntity> findByVideo_IdAndKindAndProfileAndStatus(
        Long videoId,
        VideoVersionKind kind,
        String profile,
        VideoVersionStatus status
    );

    @Query("""
        SELECT v FROM VideoVersionEntity v
        JOIN FETCH v.video
        WHERE v.video.id IN :videoIds
          AND v.kind = com.vibely.backend.enhancement.VideoVersionKind.AI_ENHANCED
          AND v.status = com.vibely.backend.enhancement.VideoVersionStatus.ACTIVE
        ORDER BY v.heightPx DESC NULLS LAST, v.createdAt DESC
        """)
    List<VideoVersionEntity> findActiveAiByVideoIds(@Param("videoIds") Collection<Long> videoIds);
}
