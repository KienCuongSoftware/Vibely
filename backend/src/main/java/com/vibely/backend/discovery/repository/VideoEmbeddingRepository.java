package com.vibely.backend.discovery.repository;

import com.vibely.backend.discovery.model.VideoEmbedding;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface VideoEmbeddingRepository extends JpaRepository<VideoEmbedding, Long> {
    Optional<VideoEmbedding> findByVideoId(Long videoId);

    @Query(
        value = """
            select ve.video_id, ve.embedding_json
            from video_embeddings ve
            join videos v on v.id = ve.video_id
            where v.status = 'READY'
              and ve.video_id <> :excludeVideoId
            order by v.ranking_score desc nulls last, v.explore_score desc
            limit :limit
            """,
        nativeQuery = true
    )
    List<Object[]> findCandidateEmbeddings(@Param("excludeVideoId") Long excludeVideoId, @Param("limit") int limit);

    List<VideoEmbedding> findByVideoIdIn(Collection<Long> videoIds);
}
