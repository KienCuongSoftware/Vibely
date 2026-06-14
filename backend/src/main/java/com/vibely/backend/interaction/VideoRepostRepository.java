package com.vibely.backend.interaction;

import com.vibely.backend.user.User;
import com.vibely.backend.video.Video;
import com.vibely.backend.video.VideoStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface VideoRepostRepository extends JpaRepository<VideoRepostEntity, Long> {

    boolean existsByUserAndVideo(User user, Video video);

    void deleteByUserAndVideo(User user, Video video);

    long countByUser(User user);

    @Query(
        "SELECT r.video FROM VideoRepostEntity r WHERE r.user = :user AND ("
            + "r.video.status = :ready OR "
            + "(r.video.author.id = :userId AND r.video.status <> :removed AND r.video.status <> :failed)"
            + ") ORDER BY r.id DESC"
    )
    Page<Video> findRepostedVideosForUser(
        @Param("user") User user,
        @Param("ready") VideoStatus ready,
        @Param("userId") Long userId,
        @Param("removed") VideoStatus removed,
        @Param("failed") VideoStatus failed,
        Pageable pageable
    );
}
