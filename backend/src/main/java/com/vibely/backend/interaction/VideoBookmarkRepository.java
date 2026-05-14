package com.vibely.backend.interaction;

import com.vibely.backend.user.User;
import com.vibely.backend.video.Video;
import com.vibely.backend.video.VideoStatus;
import java.time.LocalDateTime;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface VideoBookmarkRepository extends JpaRepository<VideoBookmarkEntity, Long> {

    boolean existsByUserAndVideo(User user, Video video);

    long countByVideo_Id(Long videoId);

    void deleteByUserAndVideo(User user, Video video);

    long countByUser(User user);

    @Query("""
        select count(b) from VideoBookmarkEntity b
        where b.video.id = :videoId and b.createdAt >= :from
        """)
    long countBookmarksForVideoSince(@Param("videoId") Long videoId, @Param("from") LocalDateTime from);

    /**
     * Video công khai (READY) hoặc bản nháp/xử lý của chính người lưu — khớp luật bookmark/lưu trên trang xem.
     */
    @Query(
        "SELECT b.video FROM VideoBookmarkEntity b WHERE b.user = :user AND ("
            + "b.video.status = :ready OR "
            + "(b.video.author.id = :userId AND b.video.status <> :removed AND b.video.status <> :failed)"
            + ") ORDER BY b.id DESC"
    )
    Page<Video> findBookmarkedVideosForUser(
        @Param("user") User user,
        @Param("ready") VideoStatus ready,
        @Param("userId") Long userId,
        @Param("removed") VideoStatus removed,
        @Param("failed") VideoStatus failed,
        Pageable pageable
    );
}
