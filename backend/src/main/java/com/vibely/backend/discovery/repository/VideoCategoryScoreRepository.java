package com.vibely.backend.discovery.repository;

import com.vibely.backend.discovery.model.VideoCategoryScore;
import com.vibely.backend.discovery.model.VideoCategoryScoreId;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface VideoCategoryScoreRepository extends JpaRepository<VideoCategoryScore, VideoCategoryScoreId> {
    @Modifying
    @Query("delete from VideoCategoryScore vcs where vcs.video.id = :videoId")
    void deleteByVideoId(@Param("videoId") Long videoId);
}
