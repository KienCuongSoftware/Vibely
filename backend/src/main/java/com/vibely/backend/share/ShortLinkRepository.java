package com.vibely.backend.share;

import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface ShortLinkRepository extends JpaRepository<ShortLink, UUID> {

    Optional<ShortLink> findByShortCodeAndStatus(String shortCode, ShortLinkStatus status);

    Optional<ShortLink> findByVideoIdAndPrimaryLinkTrueAndStatus(Long videoId, ShortLinkStatus status);

    boolean existsByShortCode(String shortCode);

    @Modifying
    @Query(value = """
        UPDATE short_links
        SET click_count = click_count + 1,
            last_clicked_at = now(),
            updated_at = now()
        WHERE id = :id
        """, nativeQuery = true)
    int incrementClickCount(@Param("id") UUID id);
}
