package com.vibely.backend.interaction;

import com.vibely.backend.user.User;
import com.vibely.backend.video.Video;
import com.vibely.backend.video.VideoStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface VideoBookmarkRepository extends JpaRepository<VideoBookmarkEntity, Long> {

    boolean existsByUserAndVideo(User user, Video video);

    void deleteByUserAndVideo(User user, Video video);

    long countByUser(User user);

    @Query(
        "SELECT b.video FROM VideoBookmarkEntity b WHERE b.user = :user AND b.video.status = :status ORDER BY b.id DESC"
    )
    Page<Video> findBookmarkedVideosForUser(
        @Param("user") User user,
        @Param("status") VideoStatus status,
        Pageable pageable
    );
}
