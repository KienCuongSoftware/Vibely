package com.vibely.backend.studio;

import com.vibely.backend.common.ApiResponse;
import java.util.List;
import java.util.UUID;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/studio/inspiration")
public class StudioInspirationController {

    private final StudioInspirationService studioInspirationService;

    public StudioInspirationController(StudioInspirationService studioInspirationService) {
        this.studioInspirationService = studioInspirationService;
    }

    @GetMapping("/categories")
    @PreAuthorize("hasRole('USER')")
    public ApiResponse<List<StudioInspirationCategoryResponse>> categories() {
        return ApiResponse.success(studioInspirationService.categories());
    }

    @GetMapping("/trending")
    @PreAuthorize("hasRole('USER')")
    public ApiResponse<StudioInspirationPageResponse> trending(
        Authentication authentication,
        @RequestParam(defaultValue = "posts") String kind,
        @RequestParam(defaultValue = "all") String category,
        @RequestParam(defaultValue = "all") String region,
        @RequestParam(defaultValue = "0") int page,
        @RequestParam(defaultValue = "20") int size
    ) {
        return ApiResponse.success(
            studioInspirationService.trending(
                authentication.getName(),
                kind,
                category,
                region,
                page,
                size
            )
        );
    }

    @GetMapping("/recommended")
    @PreAuthorize("hasRole('USER')")
    public ApiResponse<StudioInspirationRecommendedResponse> recommended(
        Authentication authentication,
        @RequestParam(defaultValue = "similar_posts") String kind,
        @RequestParam(defaultValue = "0") int page,
        @RequestParam(defaultValue = "20") int size
    ) {
        return ApiResponse.success(
            studioInspirationService.recommended(authentication.getName(), kind, page, size)
        );
    }

    @GetMapping("/saved")
    @PreAuthorize("hasRole('USER')")
    public ApiResponse<StudioInspirationPageResponse> saved(
        Authentication authentication,
        @RequestParam(defaultValue = "0") int page,
        @RequestParam(defaultValue = "20") int size
    ) {
        return ApiResponse.success(
            studioInspirationService.saved(authentication.getName(), page, size)
        );
    }

    @PostMapping("/saved/{publicId}")
    @PreAuthorize("hasRole('USER')")
    public ApiResponse<StudioInspirationVideoResponse> save(
        Authentication authentication,
        @PathVariable UUID publicId
    ) {
        return ApiResponse.success(studioInspirationService.save(authentication.getName(), publicId));
    }

    @DeleteMapping("/saved/{publicId}")
    @PreAuthorize("hasRole('USER')")
    public ApiResponse<Void> unsave(
        Authentication authentication,
        @PathVariable UUID publicId
    ) {
        studioInspirationService.unsave(authentication.getName(), publicId);
        return ApiResponse.success(null);
    }
}
