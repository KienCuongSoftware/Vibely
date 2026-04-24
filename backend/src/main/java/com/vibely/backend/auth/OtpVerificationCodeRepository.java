package com.vibely.backend.auth;

import java.time.LocalDateTime;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface OtpVerificationCodeRepository extends JpaRepository<OtpVerificationCode, Long> {

    Optional<OtpVerificationCode> findTopByEmailOrderByCreatedAtDesc(String email);

    Optional<OtpVerificationCode> findTopByEmailAndConsumedFalseOrderByCreatedAtDesc(String email);

    void deleteByExpiresAtBefore(LocalDateTime threshold);
}
