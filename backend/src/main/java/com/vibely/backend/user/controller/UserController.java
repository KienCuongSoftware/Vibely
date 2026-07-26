package com.vibely.backend.user.controller;

import com.vibely.backend.common.ApiResponse;
import com.vibely.backend.user.dto.AccountRegionResponse;
import com.vibely.backend.user.dto.CreateDataExportRequest;
import com.vibely.backend.user.dto.DataExportRequestResponse;
import com.vibely.backend.user.dto.EmailCheckResponse;
import com.vibely.backend.user.dto.PrivacySettingsResponse;
import com.vibely.backend.user.dto.UpdateAccountRegionRequest;
import com.vibely.backend.user.dto.UpdatePrivacySettingsRequest;
import com.vibely.backend.user.dto.SuggestedCreatorsResponse;
import com.vibely.backend.user.dto.PublicUserProfileResponse;
import com.vibely.backend.user.dto.UpdateProfileRequest;
import com.vibely.backend.user.dto.UserFollowListResponse;
import com.vibely.backend.user.dto.UsernameCheckResponse;
import com.vibely.backend.user.service.EmailAvailabilityService;
import com.vibely.backend.user.service.UserDataExportService;
import com.vibely.backend.user.service.UserDiscoveryService;
import com.vibely.backend.user.service.UserService;
import com.vibely.backend.user.service.UsernameService;
import com.vibely.backend.feed.dto.FeedPageResponse;
import com.vibely.backend.video.service.VideoService;
import jakarta.validation.Valid;
import java.util.List;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/users")
public class UserController {

    private final UserService userService;
    private final UsernameService usernameService;
    private final EmailAvailabilityService emailAvailabilityService;
    private final VideoService videoService;
    private final UserDiscoveryService userDiscoveryService;
    private final UserDataExportService userDataExportService;

    public UserController(
        UserService userService,
        UsernameService usernameService,
        EmailAvailabilityService emailAvailabilityService,
        VideoService videoService,
        UserDiscoveryService userDiscoveryService,
        UserDataExportService userDataExportService
    ) {
        this.userService = userService;
        this.usernameService = usernameService;
        this.emailAvailabilityService = emailAvailabilityService;
        this.videoService = videoService;
        this.userDiscoveryService = userDiscoveryService;
        this.userDataExportService = userDataExportService;
    }

    @GetMapping("/check-username")
    public ApiResponse<UsernameCheckResponse> checkUsername(
        @RequestParam("username") String username,
        @RequestParam(value = "confirm", defaultValue = "false") boolean confirm
    ) {
        return ApiResponse.success(usernameService.checkAvailability(username, confirm));
    }

    @GetMapping("/check-email")
    public ApiResponse<EmailCheckResponse> checkEmail(
        @RequestParam("email") String email,
        @RequestParam(value = "confirm", defaultValue = "false") boolean confirm
    ) {
        return ApiResponse.success(emailAvailabilityService.checkAvailability(email, confirm));
    }

    @GetMapping("/me/liked-videos")
    @PreAuthorize("hasRole('USER')")
    public ApiResponse<FeedPageResponse> myLikedVideos(
        Authentication authentication,
        @RequestParam(defaultValue = "0") int page,
        @RequestParam(defaultValue = "12") int size
    ) {
        return ApiResponse.success(videoService.getMyLikedVideos(authentication.getName(), page, size));
    }

    @GetMapping("/me/bookmarked-videos")
    @PreAuthorize("hasRole('USER')")
    public ApiResponse<FeedPageResponse> myBookmarkedVideos(
        Authentication authentication,
        @RequestParam(defaultValue = "0") int page,
        @RequestParam(defaultValue = "12") int size
    ) {
        return ApiResponse.success(videoService.getMyBookmarkedVideos(authentication.getName(), page, size));
    }

    @GetMapping("/me/reposted-videos")
    @PreAuthorize("hasRole('USER')")
    public ApiResponse<FeedPageResponse> myRepostedVideos(
        Authentication authentication,
        @RequestParam(defaultValue = "0") int page,
        @RequestParam(defaultValue = "12") int size
    ) {
        return ApiResponse.success(videoService.getMyRepostedVideos(authentication.getName(), page, size));
    }

    @GetMapping("/me/videos")
    @PreAuthorize("hasRole('USER')")
    public ApiResponse<FeedPageResponse> myUploadedVideos(
        Authentication authentication,
        @RequestParam(defaultValue = "0") int page,
        @RequestParam(defaultValue = "24") int size
    ) {
        return ApiResponse.success(videoService.getMyUploadedVideos(authentication.getName(), page, size));
    }

    @GetMapping("/me/suggested-creators")
    @PreAuthorize("hasRole('USER')")
    public ApiResponse<SuggestedCreatorsResponse> suggestedCreators(
        Authentication authentication,
        @RequestParam(defaultValue = "0") int page,
        @RequestParam(defaultValue = "24") int size
    ) {
        return ApiResponse.success(
            userDiscoveryService.getSuggestedCreators(authentication.getName(), page, size)
        );
    }

    @GetMapping("/{username}/videos")
    public ApiResponse<FeedPageResponse> publicUserVideos(
        @PathVariable("username") String username,
        @RequestParam(defaultValue = "0") int page,
        @RequestParam(defaultValue = "24") int size,
        Authentication authentication
    ) {
        return ApiResponse.success(
            videoService.getPublicVideosForUsername(username, page, size, authentication)
        );
    }

    @GetMapping("/{username}/following")
    public ApiResponse<UserFollowListResponse> getFollowing(
        @PathVariable("username") String username,
        @RequestParam(defaultValue = "0") int page,
        @RequestParam(defaultValue = "20") int size,
        Authentication authentication
    ) {
        return ApiResponse.success(userService.getFollowing(username, page, size, authentication));
    }

    @GetMapping("/{username}/followers")
    public ApiResponse<UserFollowListResponse> getFollowers(
        @PathVariable("username") String username,
        @RequestParam(defaultValue = "0") int page,
        @RequestParam(defaultValue = "20") int size,
        Authentication authentication
    ) {
        return ApiResponse.success(userService.getFollowers(username, page, size, authentication));
    }

    @PutMapping("/me")
    public ApiResponse<PublicUserProfileResponse> updateMe(
        Authentication authentication,
        @Valid @RequestBody UpdateProfileRequest request
    ) {
        return ApiResponse.success(
            userService.updateProfile(authentication.getName(), request, authentication)
        );
    }

    @PatchMapping("/me/privacy")
    @PreAuthorize("hasRole('USER')")
    public ApiResponse<PrivacySettingsResponse> updatePrivacySettings(
        Authentication authentication,
        @Valid @RequestBody UpdatePrivacySettingsRequest request
    ) {
        return ApiResponse.success(
            userService.updatePrivacySettings(authentication.getName(), request)
        );
    }

    @PatchMapping("/me/account-region")
    @PreAuthorize("hasRole('USER')")
    public ApiResponse<AccountRegionResponse> updateAccountRegion(
        Authentication authentication,
        @Valid @RequestBody UpdateAccountRegionRequest request
    ) {
        return ApiResponse.success(
            userService.updateAccountRegion(authentication.getName(), request)
        );
    }

    @GetMapping("/me/data-exports")
    @PreAuthorize("hasRole('USER')")
    public ApiResponse<List<DataExportRequestResponse>> listDataExports(Authentication authentication) {
        return ApiResponse.success(userDataExportService.list(authentication.getName()));
    }

    @PostMapping("/me/data-exports")
    @PreAuthorize("hasRole('USER')")
    public ApiResponse<DataExportRequestResponse> createDataExport(
        Authentication authentication,
        @RequestBody CreateDataExportRequest request
    ) {
        return ApiResponse.success(userDataExportService.create(authentication.getName(), request));
    }

    @DeleteMapping("/me/data-exports/{requestId}")
    @PreAuthorize("hasRole('USER')")
    public ApiResponse<DataExportRequestResponse> cancelDataExport(
        Authentication authentication,
        @PathVariable("requestId") Long requestId
    ) {
        return ApiResponse.success(userDataExportService.cancel(authentication.getName(), requestId));
    }

    @GetMapping("/{username}")
    public ApiResponse<PublicUserProfileResponse> getPublicProfile(
        @PathVariable("username") String username,
        Authentication authentication
    ) {
        return ApiResponse.success(userService.getPublicProfile(username, authentication));
    }
}
