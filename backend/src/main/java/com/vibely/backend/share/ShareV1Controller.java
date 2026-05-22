package com.vibely.backend.share;

import com.vibely.backend.common.ApiResponse;
import com.vibely.backend.share.dto.ShareAnalyticsResponse;
import com.vibely.backend.share.dto.ShareVideoRequest;
import com.vibely.backend.share.dto.ShareVideoResponse;
import jakarta.servlet.http.HttpServletRequest;
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
@RequestMapping("/api/v1/videos")
public class ShareV1Controller {

    private final ShareService shareService;

    public ShareV1Controller(ShareService shareService) {
        this.shareService = shareService;
    }

    @PostMapping("/{videoId}/share")
    @PreAuthorize("hasRole('USER')")
    public ApiResponse<ShareVideoResponse> shareVideo(
        @PathVariable Long videoId,
        Authentication authentication,
        @Valid @RequestBody(required = false) ShareVideoRequest request,
        HttpServletRequest httpRequest
    ) {
        ShareVideoRequest body = request == null ? new ShareVideoRequest(null, null, null) : request;
        return ApiResponse.success(
            shareService.createShare(videoId, authentication.getName(), body, httpRequest)
        );
    }

    @GetMapping("/{videoId}/share/analytics")
    @PreAuthorize("hasRole('USER')")
    public ApiResponse<ShareAnalyticsResponse> shareAnalytics(
        @PathVariable Long videoId,
        Authentication authentication,
        @RequestParam(defaultValue = "7") int days
    ) {
        return ApiResponse.success(
            shareService.getAnalytics(videoId, authentication.getName(), days)
        );
    }
}
