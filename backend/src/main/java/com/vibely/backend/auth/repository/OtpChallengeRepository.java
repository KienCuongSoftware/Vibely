package com.vibely.backend.auth.repository;

import com.vibely.backend.auth.entity.OtpChallenge;
import org.springframework.data.jpa.repository.JpaRepository;

public interface OtpChallengeRepository extends JpaRepository<OtpChallenge, Long> {
}
