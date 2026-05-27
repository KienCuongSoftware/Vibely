package com.vibely.backend.explore.controller;

import com.vibely.backend.common.ApiResponse;
import com.vibely.backend.explore.dto.ExploreCategoryDto;
import com.vibely.backend.explore.dto.ExplorePageDto;
import com.vibely.backend.explore.service.ExploreService;
import java.util.List;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/explore")
public class ExploreController {
    private final ExploreService exploreService;

    public ExploreController(ExploreService exploreService) {
        this.exploreService = exploreService;
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

    @GetMapping("/category/{slug}")
    public ApiResponse<ExplorePageDto> category(
        @PathVariable String slug,
        @RequestParam(required = false) String cursor,
        @RequestParam(defaultValue = "24") int size
    ) {
        return ApiResponse.success(exploreService.category(slug, cursor, size));
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
