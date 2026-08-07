package com.vibely.backend.interaction.repository;

import com.vibely.backend.interaction.entity.ProfileViewEntity;
import com.vibely.backend.studio.DailyCountProjection;
import java.time.LocalDateTime;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface ProfileViewRepository extends JpaRepository<ProfileViewEntity, Long> {

    boolean existsByProfileUser_IdAndViewerKeyAndCreatedAtGreaterThanEqual(
        Long profileUserId,
        String viewerKey,
        LocalDateTime from
    );

    long countByProfileUser_IdAndCreatedAtGreaterThanEqual(Long profileUserId, LocalDateTime from);

    long countByProfileUser_Id(Long profileUserId);

    @Query("""
        select cast(pv.createdAt as date) as day, count(pv.id) as total
        from ProfileViewEntity pv
        where pv.profileUser.id = :profileUserId
          and pv.createdAt >= :from
        group by cast(pv.createdAt as date)
        order by cast(pv.createdAt as date)
        """)
    List<DailyCountProjection> countDailyForProfileSince(
        @Param("profileUserId") Long profileUserId,
        @Param("from") LocalDateTime from
    );
}
