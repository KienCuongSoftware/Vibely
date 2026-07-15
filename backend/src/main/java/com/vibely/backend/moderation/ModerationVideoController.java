package com.vibely.backend.moderation;

import com.vibely.backend.common.ApiResponse;
import jakarta.validation.Valid;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/videos")
public class ModerationVideoController {

    private final ModerationAppealService appealService;

    public ModerationVideoController(ModerationAppealService appealService) {
        this.appealService = appealService;
    }

    @GetMapping("/{publicId}/moderation-status")
    public ApiResponse<ModerationStatusResponse> status(
        @PathVariable String publicId,
        Authentication authentication
    ) {
        String email = authentication == null ? null : authentication.getName();
        return ApiResponse.success(appealService.statusForAuthor(publicId, email));
    }

    @PostMapping("/{publicId}/moderation-appeals")
    public ApiResponse<ModerationAppealResponse> createAppeal(
        @PathVariable String publicId,
        @Valid @RequestBody ModerationAppealCreateRequest request,
        Authentication authentication
    ) {
        String email = authentication == null ? null : authentication.getName();
        return ApiResponse.success(appealService.createAppeal(publicId, email, request));
    }
}
