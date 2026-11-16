package com.vibely.backend.user.repository;

import com.vibely.backend.studio.DailyCountProjection;
import com.vibely.backend.user.entity.User;
import com.vibely.backend.user.entity.UserAccountStatus;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface UserRepository extends JpaRepository<User, Long> {
    Optional<User> findByEmail(String email);
    Optional<User> findByUsername(String username);
    boolean existsByEmail(String email);
    boolean existsByUsername(String username);

    @Query("select lower(u.email) from User u where u.email is not null")
    List<String> findAllEmails();

    @Query("select lower(u.username) from User u where u.username is not null")
    List<String> findAllUsernames();

    @Query("""
        select u from User u
        where u.accountStatus = com.vibely.backend.user.entity.UserAccountStatus.ACTIVE
          and u.onboardingCompleted = true
          and u.username is not null
          and u.username <> ''
        order by u.updatedAt desc, u.id desc
        """)
    List<User> findSitemapUsers(Pageable pageable);

    Page<User> findByAccountStatusOrderByBannedAtDesc(UserAccountStatus accountStatus, Pageable pageable);

    long countByCreatedAtLessThan(LocalDateTime createdAt);

    @Query("""
        select cast(u.createdAt as date) as day, count(u.id) as total
        from User u
        where u.createdAt >= :from
        group by cast(u.createdAt as date)
        order by cast(u.createdAt as date)
        """)
    List<DailyCountProjection> countDailyCreatedSince(@Param("from") LocalDateTime from);
}
