package com.vibely.backend.video;

import com.vibely.backend.user.User;
import java.util.Collection;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

public interface VideoRepository extends JpaRepository<Video, Long> {
    Page<Video> findByStatusOrderByCreatedAtDesc(VideoStatus status, Pageable pageable);
    Page<Video> findByAuthorInAndStatusOrderByCreatedAtDesc(Collection<User> authors, VideoStatus status, Pageable pageable);

    @Query("""
        select v from Video v
        left join LikeEntity l on l.video = v
        left join CommentEntity c on c.video = v
        where v.status = :status
        group by v
        order by (count(distinct l.id) + count(distinct c.id)) desc, v.createdAt desc
        """)
    Page<Video> findTrendingByStatus(VideoStatus status, Pageable pageable);
}
