package com.vibely.backend.publicstats;

import com.vibely.backend.common.ApiResponse;
import java.util.Map;
import org.springframework.http.CacheControl;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/public/stats")
public class PublicPlatformStatsController {

    private final PublicPlatformStatsService statsService;

    public PublicPlatformStatsController(PublicPlatformStatsService statsService) {
        this.statsService = statsService;
    }

    /** Aggregate platform counters for README / status pages (cached ~5 min). */
    @GetMapping
    public ApiResponse<PublicPlatformStatsResponse> stats() {
        return ApiResponse.success(statsService.snapshot());
    }

    /**
     * shields.io dynamic badge endpoint.
     * Example: https://img.shields.io/endpoint?url=https://vibely.sbs/api/public/stats/shield/videos
     */
    @GetMapping("/shield/{metric}")
    public ResponseEntity<Map<String, Object>> shield(@PathVariable String metric) {
        return ResponseEntity.ok()
            .cacheControl(CacheControl.maxAge(java.time.Duration.ofMinutes(5)).cachePublic())
            .body(statsService.shieldPayload(metric));
    }
}
