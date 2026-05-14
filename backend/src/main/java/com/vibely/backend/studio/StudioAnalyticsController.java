package com.vibely.backend.studio;

import com.vibely.backend.common.ApiResponse;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/studio/analytics")
public class StudioAnalyticsController {

    private final StudioAnalyticsService studioAnalyticsService;

    public StudioAnalyticsController(StudioAnalyticsService studioAnalyticsService) {
        this.studioAnalyticsService = studioAnalyticsService;
    }

    @GetMapping("/overview")
    @PreAuthorize("hasRole('USER')")
    public ApiResponse<StudioAnalyticsOverviewResponse> overview(
        Authentication authentication,
        @RequestParam(defaultValue = "7") int days
    ) {
        return ApiResponse.success(studioAnalyticsService.getOverview(authentication.getName(), days));
    }

    @GetMapping("/video/{videoId}")
    @PreAuthorize("hasRole('USER')")
    public ApiResponse<StudioVideoAnalyticsResponse> video(
        Authentication authentication,
        @PathVariable Long videoId,
        @RequestParam(defaultValue = "7") int days
    ) {
        return ApiResponse.success(
            studioAnalyticsService.getVideoAnalytics(authentication.getName(), videoId, days)
        );
    }
}
