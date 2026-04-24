package com.vibely.backend.auth;

import org.springframework.data.jpa.repository.JpaRepository;

public interface OtpChallengeRepository extends JpaRepository<OtpChallenge, Long> {
}
