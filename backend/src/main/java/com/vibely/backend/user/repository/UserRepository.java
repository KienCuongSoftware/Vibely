package com.vibely.backend.user.repository;

import com.vibely.backend.user.entity.User;
import java.util.List;
import java.util.Optional;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

public interface UserRepository extends JpaRepository<User, Long> {
    Optional<User> findByEmail(String email);
    Optional<User> findByUsername(String username);
    boolean existsByEmail(String email);
    boolean existsByUsername(String username);

    @Query("""
        select u from User u
        where u.accountStatus = com.vibely.backend.user.entity.UserAccountStatus.ACTIVE
          and u.onboardingCompleted = true
          and u.username is not null
          and u.username <> ''
        order by u.updatedAt desc, u.id desc
        """)
    List<User> findSitemapUsers(Pageable pageable);
}
