package com.vibely.backend.explore;

import java.util.Collection;
import java.util.List;
import java.util.Optional;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

public interface HashtagRepository extends JpaRepository<Hashtag, Long> {
    Optional<Hashtag> findByTag(String tag);
    List<Hashtag> findByTagIn(Collection<String> tags);

    @Query(
        value = """
            select h.*
            from hashtags h
            join video_hashtags vh on vh.hashtag_id = h.id
            join videos v on v.id = vh.video_id
            join users u on u.id = v.author_id
            where v.status = 'READY'
              and u.account_status = 'ACTIVE'
              and u.onboarding_completed = true
            group by h.id
            order by count(v.id) desc, h.tag asc
            limit :#{#pageable.pageSize}
            """,
        nativeQuery = true
    )
    List<Hashtag> findSitemapHashtags(Pageable pageable);
}
