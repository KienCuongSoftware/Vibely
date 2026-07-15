package com.vibely.backend.explore.controller;

import com.vibely.backend.common.ApiResponse;
import com.vibely.backend.explore.dto.ExploreCategoryDto;
import com.vibely.backend.explore.dto.ExplorePageDto;
import com.vibely.backend.explore.dto.ExploreTabDto;
import com.vibely.backend.explore.dto.ExploreTrendingTagsResponse;
import com.vibely.backend.explore.service.CuTagTrendingService;
import com.vibely.backend.explore.service.ExploreService;
import java.util.List;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/explore")
public class ExploreController {
    private final ExploreService exploreService;
    private final CuTagTrendingService cuTagTrendingService;

    public ExploreController(ExploreService exploreService, CuTagTrendingService cuTagTrendingService) {
        this.exploreService = exploreService;
        this.cuTagTrendingService = cuTagTrendingService;
    }

    @GetMapping("/tabs")
    public ApiResponse<List<ExploreTabDto>> tabs(Authentication authentication) {
        String viewerEmail = authentication != null ? authentication.getName() : null;
        return ApiResponse.success(exploreService.tabs(viewerEmail));
    }

    @GetMapping("/categories")
    public ApiResponse<List<ExploreCategoryDto>> categories() {
        return ApiResponse.success(exploreService.categories());
    }

    @GetMapping("/trending")
    public ApiResponse<ExplorePageDto> trending(
        @RequestParam(required = false) String cursor,
        @RequestParam(defaultValue = "24") int size
    ) {
        return ApiResponse.success(exploreService.trending(cursor, size));
    }

    @GetMapping("/trending-tags")
    public ApiResponse<ExploreTrendingTagsResponse> trendingTags(
        @RequestParam(defaultValue = "7") int windowDays,
        @RequestParam(defaultValue = "20") int limit
    ) {
        return ApiResponse.success(cuTagTrendingService.trendingTags(windowDays, limit));
    }

    @GetMapping("/for-you")
    public ApiResponse<ExplorePageDto> forYou(
        Authentication authentication,
        @RequestParam(required = false) String cursor,
        @RequestParam(defaultValue = "24") int size
    ) {
        String viewerEmail = authentication != null ? authentication.getName() : null;
        return ApiResponse.success(exploreService.forYou(viewerEmail, cursor, size));
    }

    @GetMapping("/category/{slug}")
    public ApiResponse<ExplorePageDto> category(
        @PathVariable String slug,
        @RequestParam(required = false) String cursor,
        @RequestParam(defaultValue = "24") int size
    ) {
        return ApiResponse.success(exploreService.category(slug, cursor, size));
    }

    @GetMapping("/topic/{slug}")
    public ApiResponse<ExplorePageDto> topic(
        @PathVariable String slug,
        @RequestParam(required = false) String cursor,
        @RequestParam(defaultValue = "24") int size
    ) {
        return ApiResponse.success(exploreService.topic(slug, cursor, size));
    }

    @GetMapping("/search")
    public ApiResponse<ExplorePageDto> search(
        @RequestParam("q") String q,
        @RequestParam(required = false) String cursor,
        @RequestParam(defaultValue = "24") int size
    ) {
        return ApiResponse.success(exploreService.search(q, cursor, size));
    }

    @GetMapping("/video/{publicId}/related")
    public ApiResponse<ExplorePageDto> related(
        @PathVariable String publicId,
        @RequestParam(defaultValue = "18") int size
    ) {
        return ApiResponse.success(exploreService.related(publicId, size));
    }
}
