package com.vibely.backend.live.controller;

import com.vibely.backend.common.ApiResponse;
import com.vibely.backend.live.dto.CreateLiveRequest;
import com.vibely.backend.live.dto.LiveAnalyticsResponse;
import com.vibely.backend.live.dto.LiveCapabilitiesResponse;
import com.vibely.backend.live.dto.LiveCommentPageResponse;
import com.vibely.backend.live.dto.LiveCommentRequest;
import com.vibely.backend.live.dto.LiveCommentResponse;
import com.vibely.backend.live.dto.LiveGiftRequest;
import com.vibely.backend.live.dto.LiveLikeRequest;
import com.vibely.backend.live.dto.LiveLikeResponse;
import com.vibely.backend.live.dto.LivePageResponse;
import com.vibely.backend.live.dto.LiveReplayResponse;
import com.vibely.backend.live.dto.LiveResponse;
import com.vibely.backend.live.dto.LiveStatsResponse;
import com.vibely.backend.live.dto.UpdateLiveRequest;
import com.vibely.backend.live.gift.LiveGift;
import com.vibely.backend.live.media.dto.LivePlaybackResponse;
import com.vibely.backend.live.media.dto.LivePublishCredentialResponse;
import com.vibely.backend.live.recording.LiveRecordingService;
import com.vibely.backend.live.service.LiveAnalyticsService;
import com.vibely.backend.live.service.LiveCommentService;
import com.vibely.backend.live.service.LiveGiftActionService;
import com.vibely.backend.live.service.LiveLikeService;
import com.vibely.backend.live.service.LiveService;
import jakarta.validation.Valid;
import java.util.List;
import org.springframework.http.CacheControl;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/** LIVE metadata, lifecycle, discovery, chat, likes and gifts. Reads are public; writes need a user. */
@RestController
@RequestMapping("/api/lives")
public class LiveController {

    private final LiveService liveService;
    private final LiveCommentService commentService;
    private final LiveLikeService likeService;
    private final LiveGiftActionService giftActionService;
    private final LiveRecordingService recordingService;
    private final LiveAnalyticsService analyticsService;

    public LiveController(
        LiveService liveService,
        LiveCommentService commentService,
        LiveLikeService likeService,
        LiveGiftActionService giftActionService,
        LiveRecordingService recordingService,
        LiveAnalyticsService analyticsService
    ) {
        this.liveService = liveService;
        this.commentService = commentService;
        this.likeService = likeService;
        this.giftActionService = giftActionService;
        this.recordingService = recordingService;
        this.analyticsService = analyticsService;
    }

    @PostMapping
    @PreAuthorize("hasRole('USER')")
    public ResponseEntity<ApiResponse<LiveResponse>> create(
        Authentication authentication,
        @Valid @RequestBody CreateLiveRequest request
    ) {
        return ResponseEntity.status(HttpStatus.CREATED)
            .body(ApiResponse.success(liveService.create(authentication, request)));
    }

    @GetMapping
    public ApiResponse<LivePageResponse> discover(
        Authentication authentication,
        @RequestParam(defaultValue = "0") int page,
        @RequestParam(required = false) Integer size,
        @RequestParam(required = false) String category,
        @RequestParam(required = false) String status,
        @RequestParam(required = false) String q,
        @RequestParam(required = false) String sort,
        @RequestParam(defaultValue = "false") boolean following
    ) {
        return ApiResponse.success(liveService.discover(authentication, page, size, category, status, q, sort, following));
    }

    @GetMapping("/gifts")
    public ApiResponse<List<LiveGift>> gifts() {
        return ApiResponse.success(giftActionService.catalog());
    }

    @GetMapping("/{liveId}")
    public ApiResponse<LiveResponse> get(Authentication authentication, @PathVariable String liveId) {
        return ApiResponse.success(liveService.get(authentication, liveId));
    }

    @PatchMapping("/{liveId}")
    @PreAuthorize("hasRole('USER')")
    public ApiResponse<LiveResponse> update(
        Authentication authentication,
        @PathVariable String liveId,
        @Valid @RequestBody UpdateLiveRequest request
    ) {
        return ApiResponse.success(liveService.updateSettings(authentication, liveId, request));
    }

    @PostMapping("/{liveId}/start")
    @PreAuthorize("hasRole('USER')")
    public ApiResponse<LiveResponse> start(Authentication authentication, @PathVariable String liveId) {
        return ApiResponse.success(liveService.start(authentication, liveId));
    }

    @PostMapping("/{liveId}/end")
    @PreAuthorize("hasRole('USER')")
    public ApiResponse<LiveResponse> end(Authentication authentication, @PathVariable String liveId) {
        return ApiResponse.success(liveService.end(authentication, liveId));
    }

    @PostMapping("/{liveId}/cancel")
    @PreAuthorize("hasRole('USER')")
    public ApiResponse<LiveResponse> cancel(Authentication authentication, @PathVariable String liveId) {
        return ApiResponse.success(liveService.cancel(authentication, liveId));
    }

    /** Host only: single-use WHIP endpoint for publishing camera/microphone to the media server. */
    @PostMapping("/{liveId}/publish-credential")
    @PreAuthorize("hasRole('USER')")
    public ApiResponse<LivePublishCredentialResponse> publishCredential(
        Authentication authentication,
        @PathVariable String liveId
    ) {
        return ApiResponse.success(liveService.publishCredential(authentication, liveId));
    }

    /** Public (subject to LIVE visibility): WHEP endpoint while the host is publishing. */
    @GetMapping("/{liveId}/playback")
    public ResponseEntity<ApiResponse<LivePlaybackResponse>> playback(
        Authentication authentication,
        @PathVariable String liveId
    ) {
        return ResponseEntity.ok()
            .cacheControl(CacheControl.noStore())
            .body(ApiResponse.success(liveService.playback(authentication, liveId)));
    }

    @GetMapping("/{liveId}/stats")
    public ApiResponse<LiveStatsResponse> stats(Authentication authentication, @PathVariable String liveId) {
        return ApiResponse.success(liveService.stats(authentication, liveId));
    }

    /** Server toggles (recording, HLS fallback, limits) the clients adapt to. */
    @GetMapping("/capabilities")
    public ApiResponse<LiveCapabilitiesResponse> capabilities() {
        return ApiResponse.success(liveService.capabilities());
    }

    /** Host: replay state (processing/failed/draft). Others: only a replay the host published publicly. */
    @GetMapping("/{liveId}/replay")
    public ResponseEntity<ApiResponse<LiveReplayResponse>> replay(Authentication authentication, @PathVariable String liveId) {
        return ResponseEntity.ok()
            .cacheControl(CacheControl.noStore())
            .body(ApiResponse.success(recordingService.replay(authentication, liveId)));
    }

    /** Host (or admin) only, once the LIVE has ended. */
    @GetMapping("/{liveId}/analytics")
    @PreAuthorize("hasRole('USER')")
    public ApiResponse<LiveAnalyticsResponse> analytics(Authentication authentication, @PathVariable String liveId) {
        return ApiResponse.success(analyticsService.get(authentication, liveId));
    }

    @GetMapping("/{liveId}/comments")
    public ApiResponse<LiveCommentPageResponse> comments(
        Authentication authentication,
        @PathVariable String liveId,
        @RequestParam(required = false) Long beforeId,
        @RequestParam(required = false) Long afterId,
        @RequestParam(required = false) Integer size
    ) {
        return ApiResponse.success(commentService.list(authentication, liveId, beforeId, afterId, size));
    }

    @PostMapping("/{liveId}/comments")
    @PreAuthorize("hasRole('USER')")
    public ResponseEntity<ApiResponse<LiveCommentResponse>> comment(
        Authentication authentication,
        @PathVariable String liveId,
        @Valid @RequestBody LiveCommentRequest request
    ) {
        return ResponseEntity.status(HttpStatus.CREATED)
            .body(ApiResponse.success(commentService.create(authentication, liveId, request)));
    }

    @DeleteMapping("/{liveId}/comments/{commentId}")
    @PreAuthorize("hasRole('USER')")
    public ApiResponse<Void> deleteComment(
        Authentication authentication,
        @PathVariable String liveId,
        @PathVariable Long commentId
    ) {
        commentService.delete(authentication, liveId, commentId);
        return ApiResponse.success(null);
    }

    @PostMapping("/{liveId}/likes")
    @PreAuthorize("hasRole('USER')")
    public ApiResponse<LiveLikeResponse> like(
        Authentication authentication,
        @PathVariable String liveId,
        @RequestBody(required = false) LiveLikeRequest request
    ) {
        return ApiResponse.success(likeService.like(authentication, liveId, request == null ? null : request.count()));
    }

    @PostMapping("/{liveId}/gifts")
    @PreAuthorize("hasRole('USER')")
    public ApiResponse<LiveGift> sendGift(
        Authentication authentication,
        @PathVariable String liveId,
        @Valid @RequestBody LiveGiftRequest request
    ) {
        return ApiResponse.success(giftActionService.send(authentication, liveId, request));
    }
}
