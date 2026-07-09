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

    @Query("select count(vc) from VideoCategory vc where vc.id.categoryId = :categoryId")
    long countByCategoryId(@Param("categoryId") Long categoryId);

    @Query("select count(distinct vc.id.videoId) from VideoCategory vc")
    long countDistinctVideos();

    @Query("select distinct vc.id.videoId from VideoCategory vc where vc.id.categoryId in :categoryIds")
    java.util.List<Long> findVideoIdsByCategoryIds(@Param("categoryIds") Collection<Long> categoryIds);
}
