package com.vibely.backend.video.service;

import com.vibely.backend.storage.S3PresignedUploadService;
import com.vibely.backend.video.SoundBrowseItem;
import com.vibely.backend.video.SoundBrowsePageResponse;
import java.util.List;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class SoundCatalogService {

    private final JdbcTemplate jdbcTemplate;
    private final ObjectProvider<S3PresignedUploadService> presignedUploadService;

    public SoundCatalogService(
        JdbcTemplate jdbcTemplate,
        ObjectProvider<S3PresignedUploadService> presignedUploadService
    ) {
        this.jdbcTemplate = jdbcTemplate;
        this.presignedUploadService = presignedUploadService;
    }

    @Transactional(readOnly = true)
    public SoundBrowsePageResponse browse(String query, int page, int size) {
        int safeSize = Math.min(Math.max(size, 1), 40);
        int safePage = Math.max(page, 0);
        String q = query == null ? "" : query.trim();
        String like = q.isEmpty() ? null : "%" + q.toLowerCase() + "%";

        String where = """
            v.status = 'READY'
            AND COALESCE(v.studio_draft, FALSE) = FALSE
            AND (v.scheduled_at IS NULL OR v.scheduled_at <= NOW())
            AND v.audio_url IS NOT NULL
            AND TRIM(v.audio_url) <> ''
            """;

        if (like != null) {
            where += """
                 AND (
                    LOWER(COALESCE(v.audio_title, '')) LIKE ?
                    OR LOWER(COALESCE(u.username, '')) LIKE ?
                    OR LOWER(COALESCE(u.display_name, '')) LIKE ?
                )
                """;
        }

        String countSql = """
            SELECT COUNT(*) FROM (
                SELECT v.audio_url
                FROM videos v
                INNER JOIN users u ON u.id = v.author_id
                WHERE %s
                GROUP BY v.audio_url
            ) grouped
            """.formatted(where);

        Long total = like == null
            ? jdbcTemplate.queryForObject(countSql, Long.class)
            : jdbcTemplate.queryForObject(countSql, Long.class, like, like, like);

        String listSql = """
            SELECT
                v.audio_url,
                MAX(v.audio_title) AS audio_title,
                MAX(v.thumbnail_url) AS thumbnail_url,
                MAX(v.duration_seconds) AS duration_seconds,
                MAX(COALESCE(NULLIF(TRIM(u.display_name), ''), u.username, '')) AS author_display_name,
                COUNT(*)::bigint AS usage_count
            FROM videos v
            INNER JOIN users u ON u.id = v.author_id
            WHERE %s
            GROUP BY v.audio_url
            ORDER BY usage_count DESC, MAX(v.created_at) DESC
            LIMIT ? OFFSET ?
            """.formatted(where);

        Pageable pageable = PageRequest.of(safePage, safeSize);
        List<SoundBrowseItem> items = like == null
            ? jdbcTemplate.query(
                listSql,
                (rs, rowNum) -> new SoundBrowseItem(
                    rs.getString("audio_url"),
                    rs.getString("audio_title"),
                    rs.getString("thumbnail_url"),
                    rs.getInt("duration_seconds"),
                    rs.getString("author_display_name"),
                    rs.getLong("usage_count")
                ),
                safeSize,
                pageable.getOffset()
            )
            : jdbcTemplate.query(
                listSql,
                (rs, rowNum) -> new SoundBrowseItem(
                    rs.getString("audio_url"),
                    rs.getString("audio_title"),
                    rs.getString("thumbnail_url"),
                    rs.getInt("duration_seconds"),
                    rs.getString("author_display_name"),
                    rs.getLong("usage_count")
                ),
                like,
                like,
                like,
                safeSize,
                pageable.getOffset()
            );

        long totalCount = total == null ? 0L : total;
        boolean hasNext = (long) (safePage + 1) * safeSize < totalCount;
        List<SoundBrowseItem> presigned = items.stream().map(this::presignItem).toList();
        return new SoundBrowsePageResponse(presigned, safePage, safeSize, totalCount, hasNext);
    }

    private SoundBrowseItem presignItem(SoundBrowseItem item) {
        return new SoundBrowseItem(
            presignPlaybackUrl(item.audioUrl()),
            item.audioTitle(),
            presignPlaybackUrl(item.thumbnailUrl()),
            item.durationSeconds(),
            item.authorDisplayName(),
            item.usageCount()
        );
    }

    private String presignPlaybackUrl(String url) {
        if (url == null || url.isBlank()) {
            return url;
        }
        S3PresignedUploadService svc = presignedUploadService.getIfAvailable();
        if (svc == null) {
            return url;
        }
        return svc.presignGetForPlayback(url).orElse(url);
    }
}
