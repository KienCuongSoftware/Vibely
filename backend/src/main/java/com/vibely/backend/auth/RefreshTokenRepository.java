package com.vibely.backend.auth;

import java.time.LocalDateTime;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;

public interface RefreshTokenRepository extends JpaRepository<RefreshToken, Long> {
    Optional<RefreshToken> findByTokenHash(String tokenHash);
    void deleteByExpiresAtBefore(LocalDateTime timestamp);

    @Modifying
    @Query("update RefreshToken token set token.revoked = true where token.user.id = :userId and token.revoked = false")
    int revokeAllByUserId(Long userId);
}
