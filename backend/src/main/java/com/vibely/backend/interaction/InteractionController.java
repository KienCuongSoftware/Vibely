package com.vibely.backend.interaction;

import com.vibely.backend.common.ApiResponse;
import jakarta.validation.Valid;
import java.util.List;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api")
public class InteractionController {

    private final InteractionService interactionService;

    public InteractionController(InteractionService interactionService) {
        this.interactionService = interactionService;
    }

    @PostMapping("/videos/{videoId}/likes")
    @PreAuthorize("hasRole('USER')")
    public ResponseEntity<ApiResponse<Void>> likeVideo(Authentication authentication, @PathVariable Long videoId) {
        interactionService.likeVideo(authentication.getName(), videoId);
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    @DeleteMapping("/videos/{videoId}/likes")
    @PreAuthorize("hasRole('USER')")
    public ResponseEntity<ApiResponse<Void>> unlikeVideo(Authentication authentication, @PathVariable Long videoId) {
        interactionService.unlikeVideo(authentication.getName(), videoId);
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    @PostMapping("/videos/{videoId}/bookmarks")
    @PreAuthorize("hasRole('USER')")
    public ResponseEntity<ApiResponse<Void>> bookmarkVideo(Authentication authentication, @PathVariable Long videoId) {
        interactionService.bookmarkVideo(authentication.getName(), videoId);
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    @DeleteMapping("/videos/{videoId}/bookmarks")
    @PreAuthorize("hasRole('USER')")
    public ResponseEntity<ApiResponse<Void>> unbookmarkVideo(
        Authentication authentication,
        @PathVariable Long videoId
    ) {
        interactionService.unbookmarkVideo(authentication.getName(), videoId);
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    @GetMapping("/videos/{videoId}/me")
    @PreAuthorize("hasRole('USER')")
    public ApiResponse<VideoMeStateResponse> videoMeState(
        Authentication authentication,
        @PathVariable Long videoId
    ) {
        return ApiResponse.success(interactionService.getVideoMeState(authentication.getName(), videoId));
    }

    @PostMapping("/videos/{videoId}/comments")
    @PreAuthorize("hasRole('USER')")
    public ApiResponse<CommentResponse> addComment(
        Authentication authentication,
        @PathVariable Long videoId,
        @Valid @RequestBody CommentCreateRequest request
    ) {
        return ApiResponse.success(
            interactionService.addComment(authentication.getName(), videoId, request.getContent())
        );
    }

    @GetMapping("/videos/{videoId}/comments")
    public ApiResponse<List<CommentResponse>> getComments(@PathVariable Long videoId) {
        return ApiResponse.success(interactionService.getComments(videoId));
    }

    @PostMapping("/follows/{userId}")
    @PreAuthorize("hasRole('USER')")
    public ResponseEntity<ApiResponse<Void>> follow(Authentication authentication, @PathVariable Long userId) {
        interactionService.follow(authentication.getName(), userId);
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    @DeleteMapping("/follows/{userId}")
    @PreAuthorize("hasRole('USER')")
    public ResponseEntity<ApiResponse<Void>> unfollow(Authentication authentication, @PathVariable Long userId) {
        interactionService.unfollow(authentication.getName(), userId);
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    @PostMapping("/videos/{videoId}/report")
    @PreAuthorize("hasRole('USER')")
    public ResponseEntity<ApiResponse<Void>> reportVideo(
        Authentication authentication,
        @PathVariable Long videoId,
        @Valid @RequestBody ReportVideoRequest request
    ) {
        interactionService.reportVideo(authentication.getName(), videoId, request.getReason());
        return ResponseEntity.ok(ApiResponse.success(null));
    }
}
