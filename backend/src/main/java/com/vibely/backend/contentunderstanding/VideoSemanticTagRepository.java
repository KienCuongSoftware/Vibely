package com.vibely.backend.contentunderstanding;

import java.util.Collection;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface VideoSemanticTagRepository extends JpaRepository<VideoSemanticTagEntity, VideoSemanticTagEntity.Pk> {

    @Modifying(clearAutomatically = true)
    @Query("delete from VideoSemanticTagEntity v where v.videoId = :videoId")
    void deleteByVideoId(@Param("videoId") Long videoId);

    @Query(
        value = """
            SELECT vst.video_id, st.slug, vst.confidence, vst.source, vst.reason, vst.evidence,
                   st.name, vst.model_version
            FROM video_semantic_tags vst
            JOIN semantic_tags st ON st.id = vst.tag_id
            WHERE vst.video_id = :videoId
            ORDER BY vst.confidence DESC
            """,
        nativeQuery = true
    )
    List<Object[]> findTagRowsByVideoId(@Param("videoId") Long videoId);

    @Query(
        value = """
            SELECT vst.video_id, st.slug
            FROM video_semantic_tags vst
            JOIN semantic_tags st ON st.id = vst.tag_id
            WHERE vst.video_id IN (:videoIds)
            """,
        nativeQuery = true
    )
    List<Object[]> findSlugsByVideoIds(@Param("videoIds") Collection<Long> videoIds);

    @Query(
        value = """
            SELECT DISTINCT vst.video_id
            FROM video_semantic_tags vst
            JOIN semantic_tags st ON st.id = vst.tag_id
            WHERE st.slug IN (:slugs)
              AND vst.video_id <> :excludeVideoId
            LIMIT :limit
            """,
        nativeQuery = true
    )
    List<Long> findVideoIdsByTagSlugs(
        @Param("slugs") Collection<String> slugs,
        @Param("excludeVideoId") Long excludeVideoId,
        @Param("limit") int limit
    );
}
