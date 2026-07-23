package com.vibely.backend.translation;

import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface TranslationJobRepository extends JpaRepository<TranslationJobEntity, Long> {

    Optional<TranslationJobEntity> findByVideoIdAndSourceHashAndTargetLang(
        Long videoId,
        String sourceHash,
        String targetLang
    );

    @Query(
        value = """
            SELECT id FROM translation_jobs
            WHERE job_state = 'PENDING'
            ORDER BY created_at ASC
            LIMIT 1
            FOR UPDATE SKIP LOCKED
            """,
        nativeQuery = true
    )
    List<Long> findNextPendingIdForUpdate();

    @Query(
        """
        SELECT j FROM TranslationJobEntity j
        JOIN FETCH j.video
        WHERE j.id = :id
        """
    )
    Optional<TranslationJobEntity> findWithVideoById(@Param("id") Long id);
}
