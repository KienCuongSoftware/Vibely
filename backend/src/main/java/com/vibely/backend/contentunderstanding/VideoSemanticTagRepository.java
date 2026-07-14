package com.vibely.backend.contentunderstanding;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface VideoSemanticTagRepository extends JpaRepository<VideoSemanticTagEntity, VideoSemanticTagEntity.Pk> {

    @Modifying(clearAutomatically = true)
    @Query("delete from VideoSemanticTagEntity v where v.videoId = :videoId")
    void deleteByVideoId(@Param("videoId") Long videoId);
}
