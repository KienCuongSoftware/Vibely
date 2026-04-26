package com.vibely.backend.interaction;

import com.vibely.backend.user.User;
import com.vibely.backend.video.Video;
import org.springframework.data.jpa.repository.JpaRepository;

public interface LikeRepository extends JpaRepository<LikeEntity, Long> {
    boolean existsByUserAndVideo(User user, Video video);
    void deleteByUserAndVideo(User user, Video video);
    long countByVideo(Video video);
}
