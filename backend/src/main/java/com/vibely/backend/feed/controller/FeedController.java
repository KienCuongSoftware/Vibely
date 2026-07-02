package com.vibely.backend.feed.controller;

import com.vibely.backend.common.ApiResponse;
import com.vibely.backend.common.BadRequestException;
import com.vibely.backend.feed.FeedPageResponse;
import com.vibely.backend.feed.FeedSort;
import com.vibely.backend.video.VideoService;
import org.springframework.security.authentication.AnonymousAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/feed")
public class FeedController {

    private final VideoService videoService;

    public FeedController(VideoService videoService) {
        this.videoService = videoService;
    }

    @GetMapping
    public ApiResponse<FeedPageResponse> latest(
        Authentication authentication,
        @RequestParam(required = false) String cursor,
        @RequestParam(defaultValue = "0") int page,
        @RequestParam(defaultValue = "20") int size,
        @RequestParam(defaultValue = "latest") String sort
    ) {
        String viewerEmail = authentication != null ? authentication.getName() : null;
        FeedSort feedSort = "trending-lite".equalsIgnoreCase(sort)
            ? FeedSort.TRENDING_LITE
            : FeedSort.LATEST;
        if (feedSort == FeedSort.LATEST) {
            return ApiResponse.success(
                videoService.getLatestFeedKeyset(cursor, Math.min(size, 50), viewerEmail)
            );
        }
        return ApiResponse.success(
            videoService.getFeed(page, Math.min(size, 50), feedSort, viewerEmail)
        );
    }

    @GetMapping("/for-you")
    public ApiResponse<FeedPageResponse> forYou(
        Authentication authentication,
        @RequestParam(required = false) String cursor,
        @RequestParam(defaultValue = "20") int size
    ) {
        String viewerEmail = authentication != null ? authentication.getName() : null;
        return ApiResponse.success(
            videoService.getForYouFeed(viewerEmail, Math.min(size, 50), cursor)
        );
    }

    @GetMapping("/following")
    public ApiResponse<FeedPageResponse> following(
        Authentication authentication,
        @RequestParam(defaultValue = "0") int page,
        @RequestParam(defaultValue = "20") int size
    ) {
        if (authentication == null
            || !authentication.isAuthenticated()
            || authentication instanceof AnonymousAuthenticationToken) {
            throw new BadRequestException("Đăng nhập để xem feed Đã follow");
        }
        return ApiResponse.success(
            videoService.getFollowingFeed(authentication.getName(), page, Math.min(size, 50))
        );
    }
}
