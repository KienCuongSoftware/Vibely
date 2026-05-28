package com.vibely.backend.user;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.Repository;
import org.springframework.data.repository.query.Param;

public interface SuggestedCreatorRepository extends Repository<User, Long> {

    @Query(
        value = """
            select
                u.id as id,
                u.username as username,
                u.display_name as displayName,
                count(v.id) as videoCount,
                (
                    select count(*)
                    from follows ff
                    where ff.following_id = u.id
                ) as followerCount,
                (
                    select v2.thumbnail_url
                    from videos v2
                    where v2.author_id = u.id
                      and v2.status = 'READY'
                      and v2.thumbnail_url is not null
                      and trim(v2.thumbnail_url) <> ''
                    order by v2.created_at desc
                    limit 1
                ) as previewThumbnailUrl,
                (
                    select v2.video_url
                    from videos v2
                    where v2.author_id = u.id
                      and v2.status = 'READY'
                      and v2.video_url is not null
                      and trim(v2.video_url) <> ''
                    order by v2.created_at desc
                    limit 1
                ) as previewVideoUrl
            from users u
            inner join videos v on v.author_id = u.id and v.status = 'READY'
            where u.id <> :viewerId
            group by u.id, u.username, u.display_name
            having count(v.id) >= 1
            order by
                case when exists (
                    select 1
                    from follows f
                    where f.follower_id = :viewerId
                      and f.following_id = u.id
                ) then 1 else 0 end,
                followerCount desc,
                max(v.created_at) desc
            """,
        countQuery = """
            select count(*)
            from (
                select u.id
                from users u
                inner join videos v on v.author_id = u.id and v.status = 'READY'
                where u.id <> :viewerId
                group by u.id
                having count(v.id) >= 1
            ) rows
            """,
        nativeQuery = true
    )
    Page<SuggestedCreatorProjection> findSuggestedCreators(
        @Param("viewerId") Long viewerId,
        Pageable pageable
    );
}
