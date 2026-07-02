package com.vibely.backend.video.service;

import com.vibely.backend.feed.dto.FeedPageResponse;
import com.vibely.backend.feed.FeedSort;
import com.vibely.backend.video.Video;
import com.vibely.backend.video.VideoCreateRequest;
import com.vibely.backend.video.VideoResponse;
import com.vibely.backend.video.VideoUpdateRequest;
import com.vibely.backend.video.VideoViewRequest;
import java.util.UUID;
import org.springframework.stereotype.Service;

/**
 * Facade giữ API công khai ổn định cho controller và module khác.
 */
@Service
public class VideoService {

    private final VideoCommandService commandService;
    private final VideoQueryService queryService;
    private final VideoFeedService feedService;
    private final VideoEngagementService engagementService;

    public VideoService(
        VideoCommandService commandService,
        VideoQueryService queryService,
        VideoFeedService feedService,
        VideoEngagementService engagementService
    ) {
        this.commandService = commandService;
        this.queryService = queryService;
        this.feedService = feedService;
        this.engagementService = engagementService;
    }

    public VideoResponse createVideo(String email, VideoCreateRequest request) {
        return commandService.createVideo(email, request);
    }

    public FeedPageResponse getFeed(int page, int size, FeedSort sort, String viewerEmail) {
        return feedService.getFeed(page, size, sort, viewerEmail);
    }

    public FeedPageResponse getLatestFeedKeyset(String cursor, int size, String viewerEmail) {
        return feedService.getLatestFeedKeyset(cursor, size, viewerEmail);
    }

    public FeedPageResponse getForYouFeed(String viewerEmail, int size, String cursor) {
        return feedService.getForYouFeed(viewerEmail, size, cursor);
    }

    public FeedPageResponse getFollowingFeed(String email, int page, int size) {
        return feedService.getFollowingFeed(email, page, size);
    }

    public FeedPageResponse getVideosByAudio(String audioUrl, int page, int size) {
        return feedService.getVideosByAudio(audioUrl, page, size);
    }

    public FeedPageResponse getVideosByHashtag(String tag, int page, int size) {
        return feedService.getVideosByHashtag(tag, page, size);
    }

    public FeedPageResponse getMyLikedVideos(String email, int page, int size) {
        return feedService.getMyLikedVideos(email, page, size);
    }

    public FeedPageResponse getMyBookmarkedVideos(String email, int page, int size) {
        return feedService.getMyBookmarkedVideos(email, page, size);
    }

    public FeedPageResponse getMyRepostedVideos(String email, int page, int size) {
        return feedService.getMyRepostedVideos(email, page, size);
    }

    public FeedPageResponse getMyUploadedVideos(String email, int page, int size) {
        return feedService.getMyUploadedVideos(email, page, size);
    }

    public FeedPageResponse getPublicVideosForUsername(String rawUsername, int page, int size) {
        return feedService.getPublicVideosForUsername(rawUsername, page, size);
    }

    public VideoResponse getVideoByPublicIdForViewer(UUID publicId, String viewerEmail) {
        return queryService.getVideoByPublicIdForViewer(publicId, viewerEmail);
    }

    public VideoResponse getVideoByIdForViewer(Long id, String viewerEmail) {
        return queryService.getVideoByIdForViewer(id, viewerEmail);
    }

    public VideoResponse updateVideo(String email, UUID publicId, VideoUpdateRequest request) {
        return commandService.updateVideo(email, publicId, request);
    }

    public VideoResponse updateVideo(String email, Long videoId, VideoUpdateRequest request) {
        return commandService.updateVideo(email, videoId, request);
    }

    public void deleteVideo(String email, UUID publicId) {
        commandService.deleteVideo(email, publicId);
    }

    public void deleteVideo(String email, Long videoId) {
        commandService.deleteVideo(email, videoId);
    }

    public VideoResponse retryVideoProcessing(String email, UUID publicId) {
        return commandService.retryVideoProcessing(email, publicId);
    }

    public Video getVideoByPublicIdOrThrow(UUID publicId) {
        return queryService.getVideoByPublicIdOrThrow(publicId);
    }

    public Video getVideoOrThrow(Long id) {
        return queryService.getVideoOrThrow(id);
    }

    public void recordView(UUID publicId, VideoViewRequest body) {
        engagementService.recordView(publicId, body);
    }

    public void recordView(UUID publicId, VideoViewRequest body, String viewerEmail) {
        engagementService.recordView(publicId, body, viewerEmail);
    }

    public void recordView(Long id, VideoViewRequest body) {
        engagementService.recordView(id, body);
    }

    public void recordView(Long id, VideoViewRequest body, String viewerEmail) {
        engagementService.recordView(id, body, viewerEmail);
    }

    public void recordShare(UUID publicId) {
        engagementService.recordShare(publicId);
    }

    public void recordShare(UUID publicId, String viewerEmail) {
        engagementService.recordShare(publicId, viewerEmail);
    }

    public void recordShare(Long videoId) {
        engagementService.recordShare(videoId);
    }

    public void recordShare(Long videoId, String viewerEmail) {
        engagementService.recordShare(videoId, viewerEmail);
    }
}
