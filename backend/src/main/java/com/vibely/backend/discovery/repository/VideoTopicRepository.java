package com.vibely.backend.discovery.repository;

import com.vibely.backend.discovery.model.VideoTopic;
import com.vibely.backend.discovery.model.VideoTopicId;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface VideoTopicRepository extends JpaRepository<VideoTopic, VideoTopicId> {
    @Modifying
    @Query("delete from VideoTopic vt where vt.video.id = :videoId")
    void deleteByVideoId(@Param("videoId") Long videoId);

    List<VideoTopic> findByVideoIdOrderByScoreDesc(Long videoId);

    @Query(
        value = """
            select vt.topic_id, vt.score
            from video_topics vt
            where vt.video_id = :videoId
            order by vt.score desc
            """,
        nativeQuery = true
    )
    List<Object[]> findTopicScoresByVideoId(@Param("videoId") Long videoId);

    @Query(
        value = """
            select distinct vt2.video_id
            from video_topics vt1
            join video_topics vt2 on vt2.topic_id = vt1.topic_id and vt2.video_id <> vt1.video_id
            where vt1.video_id = :videoId
            order by vt2.score desc
            limit :limit
            """,
        nativeQuery = true
    )
    List<Long> findRelatedVideoIdsByTopics(@Param("videoId") Long videoId, @Param("limit") int limit);

    @Query(
        value = """
            select vt.video_id
            from video_topics vt
            join videos v on v.id = vt.video_id
            where vt.topic_id = :topicId and v.status = 'READY'
            order by vt.score desc, v.ranking_score desc nulls last, v.explore_score desc
            limit :limit
            """,
        nativeQuery = true
    )
    List<Long> findRelatedVideoIdsByTopicsForTopic(@Param("topicId") Long topicId, @Param("limit") int limit);
}
