package com.vibely.backend.search.repository;

import java.util.List;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import com.vibely.backend.user.entity.User;

@Repository
public interface SearchQueryRepository extends JpaRepository<User, Long> {

    @Query(
        value = """
            select u.id as id,
                   u.username as username,
                   u.display_name as displayName,
                   u.avatar_url as avatarUrl,
                   u.google_avatar_url as googleAvatarUrl
            from users u
            where vibely_search_fold(u.username) like concat('%', :q, '%')
               or vibely_search_fold(u.display_name) like concat('%', :q, '%')
            order by u.id
            limit :#{#pageable.pageSize}
            """,
        nativeQuery = true
    )
    List<SearchUserProjection> findUserCandidates(@Param("q") String q, Pageable pageable);

    @Query(
        value = """
            select                    v.id as id,
                   cast(v.public_id as varchar(36)) as publicId,
                   v.title as title,
                   v.description as description,
                   v.thumbnail_url as thumbnailUrl,
                   v.video_url as videoUrl,
                   v.master_playlist_url as masterPlaylistUrl,
                   v.created_at as createdAt,
                   u.id as authorId,
                   u.username as authorUsername,
                   u.display_name as authorDisplayName,
                   coalesce(nullif(trim(u.avatar_url), ''), nullif(trim(u.google_avatar_url), ''), '/images/users/default-avatar.jpeg') as authorAvatarUrl,
                   coalesce(ves.views, 0) as viewCount,
                   coalesce(lc.like_count, 0) as likeCount,
                   (vibely_search_fold(coalesce(v.title, '')) like concat('%', :q, '%')
                     or replace(vibely_search_fold(coalesce(v.title, '')), ' ', '') like concat('%', replace(:q, ' ', ''), '%')
                   ) as titleMatch,
                   (
                     vibely_search_fold(coalesce(v.description, '')) like concat('%', :q, '%')
                     or replace(vibely_search_fold(coalesce(v.description, '')), ' ', '') like concat('%', replace(:q, ' ', ''), '%')
                     or max(case
                          when vibely_search_fold(coalesce(dt.translated_text, '')) like concat('%', :q, '%') then 1
                          when replace(vibely_search_fold(coalesce(dt.translated_text, '')), ' ', '') like concat('%', replace(:q, ' ', ''), '%') then 1
                          else 0
                        end) = 1
                   ) as descriptionMatch,
                   (max(case
                        when vibely_search_fold(coalesce(dt.translated_text, '')) like concat('%', :q, '%') then 1
                        when replace(vibely_search_fold(coalesce(dt.translated_text, '')), ' ', '') like concat('%', replace(:q, ' ', ''), '%') then 1
                        else 0
                    end) = 1) as translatedMatch,
                   max(dt.translated_text) filter (
                     where vibely_search_fold(coalesce(dt.translated_text, '')) like concat('%', :q, '%')
                        or replace(vibely_search_fold(coalesce(dt.translated_text, '')), ' ', '') like concat('%', replace(:q, ' ', ''), '%')
                   ) as matchedTranslatedText,
                   (max(case
                        when vibely_search_fold(coalesce(h.tag, '')) like concat('%', :q, '%') then 1
                        when replace(vibely_search_fold(coalesce(h.tag, '')), ' ', '') like concat('%', replace(:q, ' ', ''), '%') then 1
                        else 0
                    end) = 1) as hashtagMatch,
                   (max(case
                        when vibely_search_fold(coalesce(st.slug, '')) like concat('%', :q, '%') then 1
                        when vibely_search_fold(coalesce(sta.alias, '')) like concat('%', :q, '%') then 1
                        else 0
                    end) = 1) as semanticTagMatch
            from videos v
            join users u on u.id = v.author_id
            left join video_engagement_stats ves on ves.video_id = v.id
            left join (
                select l.video_id, count(l.id) as like_count
                from likes l
                group by l.video_id
            ) lc on lc.video_id = v.id
            left join video_hashtags vh on vh.video_id = v.id
            left join hashtags h on h.id = vh.hashtag_id
            left join video_semantic_tags vst on vst.video_id = v.id
            left join semantic_tags st on st.id = vst.tag_id
            left join semantic_tag_aliases sta on sta.tag_id = st.id
            left join description_translations dt on dt.video_id = v.id
            where v.status = 'READY'
              and coalesce(v.privacy, 'PUBLIC') = 'PUBLIC'
              and coalesce(v.studio_draft, false) = false
              and v.intended_privacy is null
              and not exists (
                  select 1 from moderation_decisions md
                  where md.video_id = v.id
                    and (md.review_required = true or md.explore_eligible = false)
              )
              and (
                vibely_search_fold(coalesce(v.title, '')) like concat('%', :q, '%')
                or replace(vibely_search_fold(coalesce(v.title, '')), ' ', '') like concat('%', replace(:q, ' ', ''), '%')
                or vibely_search_fold(coalesce(v.description, '')) like concat('%', :q, '%')
                or replace(vibely_search_fold(coalesce(v.description, '')), ' ', '') like concat('%', replace(:q, ' ', ''), '%')
                or vibely_search_fold(coalesce(dt.translated_text, '')) like concat('%', :q, '%')
                or replace(vibely_search_fold(coalesce(dt.translated_text, '')), ' ', '') like concat('%', replace(:q, ' ', ''), '%')
                or vibely_search_fold(coalesce(h.tag, '')) like concat('%', :q, '%')
                or replace(vibely_search_fold(coalesce(h.tag, '')), ' ', '') like concat('%', replace(:q, ' ', ''), '%')
                or vibely_search_fold(coalesce(st.slug, '')) like concat('%', :q, '%')
                or vibely_search_fold(coalesce(sta.alias, '')) like concat('%', :q, '%')
              )
            group by v.id, v.public_id, v.title, v.description, v.thumbnail_url, v.video_url,
                     v.master_playlist_url, v.created_at, u.id, u.username, u.display_name,
                     u.google_avatar_url, u.avatar_url, ves.views, lc.like_count
            order by v.id
            limit :#{#pageable.pageSize}
            """,
        nativeQuery = true
    )
    List<SearchVideoProjection> findVideoCandidates(@Param("q") String q, Pageable pageable);

    @Query(
        value = """
            select h.id as id,
                   h.tag as tag,
                   count(vh.video_id) as usageCount
            from hashtags h
            left join video_hashtags vh on vh.hashtag_id = h.id
            where vibely_search_fold(h.tag) like concat('%', :q, '%')
               or replace(vibely_search_fold(h.tag), ' ', '') like concat('%', replace(:q, ' ', ''), '%')
            group by h.id, h.tag
            order by usageCount desc, h.tag asc
            limit :#{#pageable.pageSize}
            """,
        nativeQuery = true
    )
    List<SearchHashtagProjection> findHashtagCandidates(@Param("q") String q, Pageable pageable);
}
