package com.vibely.backend.interaction;

import com.vibely.backend.video.Video;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface CommentRepository extends JpaRepository<CommentEntity, Long> {
    List<CommentEntity> findByVideoOrderByCreatedAtDesc(Video video);
    long countByVideo(Video video);
}
