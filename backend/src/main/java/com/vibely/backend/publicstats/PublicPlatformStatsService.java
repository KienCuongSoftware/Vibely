package com.vibely.backend.publicstats;

import java.time.Duration;
import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.Map;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

@Service
public class PublicPlatformStatsService {

    private static final Duration CACHE_TTL = Duration.ofMinutes(5);
    private static final int SUPPORTED_LOCALES = 56;

    private final JdbcTemplate jdbcTemplate;

    private volatile CachedSnapshot cache;

    public PublicPlatformStatsService(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    public PublicPlatformStatsResponse snapshot() {
        CachedSnapshot hit = cache;
        if (hit != null && hit.expiresAt.isAfter(Instant.now())) {
            return hit.stats;
        }
        PublicPlatformStatsResponse fresh = loadFromDatabase();
        cache = new CachedSnapshot(fresh, Instant.now().plus(CACHE_TTL));
        return fresh;
    }

    public Map<String, Object> shieldPayload(String metric) {
        PublicPlatformStatsResponse stats = snapshot();
        String key = metric == null ? "" : metric.trim().toLowerCase();
        return switch (key) {
            case "users" -> shield("creators", formatCount(stats.activeUsers()), "brightgreen");
            case "videos" -> shield("videos", formatCount(stats.publishedVideos()), "007396");
            case "views" -> shield("views", formatCount(stats.totalViews()), "fe2c55");
            case "locales" -> shield("locales", Integer.toString(stats.supportedLocales()), "blueviolet");
            case "status" -> shield(
                "vibely.sbs",
                "UP".equalsIgnoreCase(stats.apiStatus()) ? "online" : "degraded",
                "UP".equalsIgnoreCase(stats.apiStatus()) ? "brightgreen" : "orange"
            );
            default -> shield("stats", "unknown", "lightgrey");
        };
    }

    private PublicPlatformStatsResponse loadFromDatabase() {
        Long activeUsers = jdbcTemplate.queryForObject(
            """
            SELECT count(*) FROM users
            WHERE account_status = 'ACTIVE'
            """,
            Long.class
        );
        Long publishedVideos = jdbcTemplate.queryForObject(
            """
            SELECT count(*) FROM videos
            WHERE status = 'READY'
              AND COALESCE(studio_draft, FALSE) = FALSE
            """,
            Long.class
        );
        Long totalViews = jdbcTemplate.queryForObject(
            "SELECT count(*) FROM video_views",
            Long.class
        );
        return new PublicPlatformStatsResponse(
            activeUsers == null ? 0L : activeUsers,
            publishedVideos == null ? 0L : publishedVideos,
            totalViews == null ? 0L : totalViews,
            SUPPORTED_LOCALES,
            "UP",
            Instant.now()
        );
    }

    private static Map<String, Object> shield(String label, String message, String color) {
        Map<String, Object> map = new LinkedHashMap<>();
        map.put("schemaVersion", 1);
        map.put("label", label);
        map.put("message", message);
        map.put("color", color);
        return map;
    }

    static String formatCount(long value) {
        if (value >= 1_000_000) {
            return String.format("%.1fM", value / 1_000_000.0);
        }
        if (value >= 10_000) {
            return String.format("%.0fk", value / 1_000.0);
        }
        if (value >= 1_000) {
            return String.format("%.1fk", value / 1_000.0);
        }
        return Long.toString(value);
    }

    private record CachedSnapshot(PublicPlatformStatsResponse stats, Instant expiresAt) {
    }
}
