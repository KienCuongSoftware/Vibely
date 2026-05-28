package com.vibely.backend.feed;

import com.vibely.backend.common.ApiResponse;
import com.vibely.backend.video.VideoService;
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

    @GetMapping("/following")
    public ApiResponse<FeedPageResponse> following(
        Authentication authentication,
        @RequestParam(defaultValue = "0") int page,
        @RequestParam(defaultValue = "20") int size
    ) {
        return ApiResponse.success(
            videoService.getFollowingFeed(authentication.getName(), page, Math.min(size, 50))
        );
    }
}
