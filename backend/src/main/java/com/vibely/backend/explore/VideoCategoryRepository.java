package com.vibely.backend.explore;

import java.util.Collection;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface VideoCategoryRepository extends JpaRepository<VideoCategory, VideoCategoryId> {
    @Modifying
    @Query("delete from VideoCategory vc where vc.id.videoId = :videoId")
    void deleteByVideoId(@Param("videoId") Long videoId);

    /**
     * Count videos that would actually appear in Explore for this category
     * (READY + PUBLIC + score threshold + moderation eligible).
     * Do not count raw AI category links alone — those create empty tabs.
     */
    @Query(
        value = """
            SELECT COUNT(DISTINCT v.id)
            FROM video_categories vc
            JOIN videos v ON v.id = vc.video_id
            WHERE vc.category_id = :categoryId
              AND vc.score >= 1.5
              AND v.status = 'READY'
              AND COALESCE(v.privacy, 'PUBLIC') = 'PUBLIC'
              AND COALESCE(v.studio_draft, false) = false
              AND NOT EXISTS (
                  SELECT 1 FROM moderation_decisions md
                  WHERE md.video_id = v.id
                    AND md.explore_eligible = false
                    AND md.shadow = false
              )
            """,
        nativeQuery = true
    )
    long countByCategoryId(@Param("categoryId") Long categoryId);

    /**
     * Distinct explore-eligible videos that have at least one strong category link.
     */
    @Query(
        value = """
            SELECT COUNT(DISTINCT v.id)
            FROM video_categories vc
            JOIN videos v ON v.id = vc.video_id
            WHERE vc.score >= 1.5
              AND v.status = 'READY'
              AND COALESCE(v.privacy, 'PUBLIC') = 'PUBLIC'
              AND COALESCE(v.studio_draft, false) = false
              AND NOT EXISTS (
                  SELECT 1 FROM moderation_decisions md
                  WHERE md.video_id = v.id
                    AND md.explore_eligible = false
                    AND md.shadow = false
              )
            """,
        nativeQuery = true
    )
    long countDistinctVideos();

    @Query("select distinct vc.id.videoId from VideoCategory vc where vc.id.categoryId in :categoryIds")
    java.util.List<Long> findVideoIdsByCategoryIds(@Param("categoryIds") Collection<Long> categoryIds);
}
