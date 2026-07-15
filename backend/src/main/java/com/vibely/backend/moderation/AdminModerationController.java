package com.vibely.backend.moderation;

import com.vibely.backend.common.ApiResponse;
import com.vibely.backend.user.entity.User;
import com.vibely.backend.user.repository.UserRepository;
import jakarta.validation.Valid;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/admin/moderation")
@PreAuthorize("hasRole('ADMIN')")
public class AdminModerationController {

    private final AdminModerationService adminModerationService;
    private final ModerationAppealService appealService;
    private final UserRepository userRepository;

    public AdminModerationController(
        AdminModerationService adminModerationService,
        ModerationAppealService appealService,
        UserRepository userRepository
    ) {
        this.adminModerationService = adminModerationService;
        this.appealService = appealService;
        this.userRepository = userRepository;
    }

    /** Alias for clients that call /api/admin/moderation without /queue. */
    @GetMapping
    public ApiResponse<AdminModerationQueuePageResponse> listQueueRoot(
        @RequestParam(defaultValue = "0") int page,
        @RequestParam(defaultValue = "20") int size,
        @RequestParam(required = false) String state
    ) {
        return listQueue(page, size, state);
    }

    @GetMapping("/queue")
    public ApiResponse<AdminModerationQueuePageResponse> listQueue(
        @RequestParam(defaultValue = "0") int page,
        @RequestParam(defaultValue = "20") int size,
        @RequestParam(required = false) String state
    ) {
        return ApiResponse.success(adminModerationService.listQueue(page, size, state));
    }

    @PostMapping("/queue/{queueId}/claim")
    public ApiResponse<AdminModerationQueueItemResponse> claim(
        @PathVariable long queueId,
        Authentication authentication
    ) {
        return ApiResponse.success(
            adminModerationService.claim(queueId, adminLabel(authentication))
        );
    }

    @PostMapping("/queue/{queueId}/resolve")
    public ApiResponse<AdminModerationDetailResponse> resolve(
        @PathVariable long queueId,
        @Valid @RequestBody AdminModerationResolveRequest request,
        Authentication authentication
    ) {
        Long adminUserId = userRepository.findByEmail(authentication.getName())
            .map(User::getId)
            .orElse(null);
        return ApiResponse.success(
            adminModerationService.resolve(
                queueId,
                request,
                adminUserId,
                adminLabel(authentication)
            )
        );
    }

    @GetMapping("/videos/{publicId}")
    public ApiResponse<AdminModerationDetailResponse> getVideoDetail(@PathVariable String publicId) {
        return ApiResponse.success(adminModerationService.getDetailByPublicId(publicId));
    }

    @GetMapping("/appeals")
    public ApiResponse<AdminModerationAppealPageResponse> listAppeals(
        @RequestParam(defaultValue = "0") int page,
        @RequestParam(defaultValue = "20") int size,
        @RequestParam(required = false) String state
    ) {
        return ApiResponse.success(appealService.listAppeals(page, size, state));
    }

    @PostMapping("/appeals/{appealId}/resolve")
    public ApiResponse<ModerationAppealResponse> resolveAppeal(
        @PathVariable long appealId,
        @Valid @RequestBody AdminModerationAppealResolveRequest request,
        Authentication authentication
    ) {
        Long adminUserId = userRepository.findByEmail(authentication.getName())
            .map(User::getId)
            .orElse(null);
        return ApiResponse.success(appealService.resolveAppeal(appealId, request, adminUserId));
    }

    private String adminLabel(Authentication authentication) {
        if (authentication == null || authentication.getName() == null) {
            return "admin";
        }
        return authentication.getName();
    }
}
