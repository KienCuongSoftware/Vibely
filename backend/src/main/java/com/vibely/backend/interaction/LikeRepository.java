package com.vibely.backend.interaction;

import com.vibely.backend.user.User;
import com.vibely.backend.video.Video;
import com.vibely.backend.video.VideoStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface LikeRepository extends JpaRepository<LikeEntity, Long> {
    boolean existsByUserAndVideo(User user, Video video);
    void deleteByUserAndVideo(User user, Video video);
    long countByVideo(Video video);

    long countByUser(User user);

    @Query(
        "SELECT l.video FROM LikeEntity l WHERE l.user = :user AND l.video.status = :status ORDER BY l.id DESC"
    )
    Page<Video> findLikedVideosForUser(
        @Param("user") User user,
        @Param("status") VideoStatus status,
        Pageable pageable
    );
}
