package com.vibely.backend.share;

import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface VideoShareRepository extends JpaRepository<VideoShare, UUID> {

    Optional<VideoShare> findByIdempotencyKey(String idempotencyKey);
}
