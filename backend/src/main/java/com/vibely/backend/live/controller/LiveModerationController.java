package com.vibely.backend.live.controller;

import com.vibely.backend.common.ApiResponse;
import com.vibely.backend.live.dto.LiveModeratorResponse;
import com.vibely.backend.live.dto.LiveReportRequest;
import com.vibely.backend.live.dto.LiveRestrictionRequest;
import com.vibely.backend.live.dto.LiveRestrictionResponse;
import com.vibely.backend.live.service.LiveModerationService;
import jakarta.validation.Valid;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/lives")
@PreAuthorize("hasRole('USER')")
public class LiveModerationController {

    private final LiveModerationService moderationService;

    public LiveModerationController(LiveModerationService moderationService) {
        this.moderationService = moderationService;
    }

    @PostMapping("/{liveId}/restrictions/{userId}")
    public ApiResponse<LiveRestrictionResponse> restrict(
        Authentication authentication,
        @PathVariable String liveId,
        @PathVariable Long userId,
        @Valid @RequestBody LiveRestrictionRequest request
    ) {
        return ApiResponse.success(moderationService.restrict(authentication, liveId, userId, request));
    }

    @DeleteMapping("/{liveId}/restrictions/{userId}")
    public ApiResponse<Void> unrestrict(
        Authentication authentication,
        @PathVariable String liveId,
        @PathVariable Long userId,
        @RequestParam String type
    ) {
        moderationService.unrestrict(authentication, liveId, userId, type);
        return ApiResponse.success(null);
    }

    @PostMapping("/{liveId}/reports")
    public ResponseEntity<ApiResponse<Void>> report(
        Authentication authentication,
        @PathVariable String liveId,
        @Valid @RequestBody LiveReportRequest request
    ) {
        moderationService.report(authentication, liveId, request);
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.success(null));
    }

    /** Moderators appointed by the current user for all of their LIVEs. */
    @GetMapping("/moderators")
    public ApiResponse<List<LiveModeratorResponse>> moderators(Authentication authentication) {
        return ApiResponse.success(moderationService.listModerators(authentication));
    }

    @PostMapping("/moderators/{userId}")
    public ApiResponse<LiveModeratorResponse> addModerator(Authentication authentication, @PathVariable Long userId) {
        return ApiResponse.success(moderationService.addModerator(authentication, userId));
    }

    @DeleteMapping("/moderators/{userId}")
    public ApiResponse<Void> removeModerator(Authentication authentication, @PathVariable Long userId) {
        moderationService.removeModerator(authentication, userId);
        return ApiResponse.success(null);
    }
}
