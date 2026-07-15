package com.vibely.backend.explore.service;

import com.vibely.backend.common.SqlSafe;
import com.vibely.backend.explore.dto.ExploreTrendingTagDto;
import com.vibely.backend.explore.dto.ExploreTrendingTagsResponse;
import java.util.ArrayList;
import java.util.List;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Phase 5 — trending by CU tag growth velocity (recent window vs prior window).
 */
@Service
public class CuTagTrendingService {

    private final JdbcTemplate jdbcTemplate;

    public CuTagTrendingService(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    @Transactional(readOnly = true)
    public ExploreTrendingTagsResponse trendingTags(int windowDays, int limit) {
        int days = Math.max(1, Math.min(windowDays, 30));
        int safeLimit = SqlSafe.clampPageSize(limit, 1, 50);
        List<ExploreTrendingTagDto> items = jdbcTemplate.query(
            """
                WITH bounds AS (
                    SELECT NOW() AS now_ts,
                           NOW() - (CAST(? AS int) * INTERVAL '1 day') AS recent_start,
                           NOW() - (CAST(? AS int) * 2 * INTERVAL '1 day') AS prev_start
                ),
                recent AS (
                    SELECT vst.tag_id, COUNT(*)::bigint AS cnt
                    FROM video_semantic_tags vst
                    JOIN videos v ON v.id = vst.video_id
                    CROSS JOIN bounds b
                    WHERE v.status = 'READY'
                      AND coalesce(v.privacy, 'PUBLIC') = 'PUBLIC'
                      AND coalesce(v.studio_draft, false) = false
                      AND vst.confidence >= 0.45
                      AND vst.created_at >= b.recent_start
                      AND vst.created_at < b.now_ts
                    GROUP BY vst.tag_id
                ),
                prev AS (
                    SELECT vst.tag_id, COUNT(*)::bigint AS cnt
                    FROM video_semantic_tags vst
                    JOIN videos v ON v.id = vst.video_id
                    CROSS JOIN bounds b
                    WHERE v.status = 'READY'
                      AND coalesce(v.privacy, 'PUBLIC') = 'PUBLIC'
                      AND coalesce(v.studio_draft, false) = false
                      AND vst.confidence >= 0.45
                      AND vst.created_at >= b.prev_start
                      AND vst.created_at < b.recent_start
                    GROUP BY vst.tag_id
                )
                SELECT st.slug,
                       st.name,
                       coalesce(r.cnt, 0) AS count_recent,
                       coalesce(p.cnt, 0) AS count_prev,
                       CASE
                         WHEN coalesce(p.cnt, 0) = 0 THEN coalesce(r.cnt, 0)::double precision
                         ELSE (coalesce(r.cnt, 0) - coalesce(p.cnt, 0))::double precision
                              / coalesce(p.cnt, 0)::double precision
                       END AS growth_rate
                FROM recent r
                JOIN semantic_tags st ON st.id = r.tag_id AND st.status = 'active'
                LEFT JOIN prev p ON p.tag_id = r.tag_id
                WHERE coalesce(r.cnt, 0) >= 1
                ORDER BY growth_rate DESC, count_recent DESC, st.slug ASC
                LIMIT ?
                """,
            (rs, i) -> new ExploreTrendingTagDto(
                rs.getString("slug"),
                rs.getString("name"),
                rs.getLong("count_recent"),
                rs.getLong("count_prev"),
                rs.getDouble("growth_rate")
            ),
            days,
            days,
            safeLimit
        );
        return new ExploreTrendingTagsResponse(days, new ArrayList<>(items));
    }
}
