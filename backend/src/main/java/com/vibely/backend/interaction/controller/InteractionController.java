package com.vibely.backend.interaction.controller;

import com.vibely.backend.common.ApiResponse;
import com.vibely.backend.interaction.dto.CommentCreateRequest;
import com.vibely.backend.interaction.dto.CommentResponse;
import com.vibely.backend.interaction.dto.FriendMentionResponse;
import com.vibely.backend.interaction.dto.ReportVideoRequest;
import com.vibely.backend.interaction.dto.VideoMeStateResponse;
import com.vibely.backend.interaction.service.InteractionService;
import com.vibely.backend.video.VideoPublicIds;
import jakarta.validation.Valid;
import java.util.List;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.authentication.AnonymousAuthenticationToken;
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

    @PostMapping("/videos/{publicId}/likes")
    @PreAuthorize("hasRole('USER')")
    public ResponseEntity<ApiResponse<Void>> likeVideo(
        Authentication authentication,
        @PathVariable String publicId
    ) {
        interactionService.likeVideo(authentication.getName(), VideoPublicIds.parse(publicId));
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    @DeleteMapping("/videos/{publicId}/likes")
    @PreAuthorize("hasRole('USER')")
    public ResponseEntity<ApiResponse<Void>> unlikeVideo(
        Authentication authentication,
        @PathVariable String publicId
    ) {
        interactionService.unlikeVideo(authentication.getName(), VideoPublicIds.parse(publicId));
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    @PostMapping("/videos/{publicId}/bookmarks")
    @PreAuthorize("hasRole('USER')")
    public ResponseEntity<ApiResponse<Void>> bookmarkVideo(
        Authentication authentication,
        @PathVariable String publicId
    ) {
        interactionService.bookmarkVideo(authentication.getName(), VideoPublicIds.parse(publicId));
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    @DeleteMapping("/videos/{publicId}/bookmarks")
    @PreAuthorize("hasRole('USER')")
    public ResponseEntity<ApiResponse<Void>> unbookmarkVideo(
        Authentication authentication,
        @PathVariable String publicId
    ) {
        interactionService.unbookmarkVideo(authentication.getName(), VideoPublicIds.parse(publicId));
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    @PostMapping("/videos/{publicId}/reposts")
    @PreAuthorize("hasRole('USER')")
    public ResponseEntity<ApiResponse<Void>> repostVideo(
        Authentication authentication,
        @PathVariable String publicId
    ) {
        interactionService.repostVideo(authentication.getName(), VideoPublicIds.parse(publicId));
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    @DeleteMapping("/videos/{publicId}/reposts")
    @PreAuthorize("hasRole('USER')")
    public ResponseEntity<ApiResponse<Void>> unrepostVideo(
        Authentication authentication,
        @PathVariable String publicId
    ) {
        interactionService.unrepostVideo(authentication.getName(), VideoPublicIds.parse(publicId));
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    @GetMapping("/videos/{publicId}/me")
    @PreAuthorize("hasRole('USER')")
    public ApiResponse<VideoMeStateResponse> videoMeState(
        Authentication authentication,
        @PathVariable String publicId
    ) {
        return ApiResponse.success(
            interactionService.getVideoMeState(authentication.getName(), VideoPublicIds.parse(publicId))
        );
    }

    @PostMapping("/videos/{publicId}/comments")
    @PreAuthorize("hasRole('USER')")
    public ApiResponse<CommentResponse> addComment(
        Authentication authentication,
        @PathVariable String publicId,
        @Valid @RequestBody CommentCreateRequest request
    ) {
        return ApiResponse.success(
            interactionService.addComment(
                authentication.getName(),
                VideoPublicIds.parse(publicId),
                request.getContent(),
                request.getParentCommentId()
            )
        );
    }

    @DeleteMapping("/videos/{publicId}/comments/{commentId}")
    @PreAuthorize("hasRole('USER')")
    public ResponseEntity<ApiResponse<Void>> deleteComment(
        Authentication authentication,
        @PathVariable String publicId,
        @PathVariable Long commentId
    ) {
        interactionService.deleteComment(
            authentication.getName(),
            VideoPublicIds.parse(publicId),
            commentId
        );
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    @PostMapping("/videos/{publicId}/comments/{commentId}/likes")
    @PreAuthorize("hasRole('USER')")
    public ResponseEntity<ApiResponse<Void>> likeComment(
        Authentication authentication,
        @PathVariable String publicId,
        @PathVariable Long commentId
    ) {
        interactionService.likeComment(
            authentication.getName(),
            VideoPublicIds.parse(publicId),
            commentId
        );
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    @DeleteMapping("/videos/{publicId}/comments/{commentId}/likes")
    @PreAuthorize("hasRole('USER')")
    public ResponseEntity<ApiResponse<Void>> unlikeComment(
        Authentication authentication,
        @PathVariable String publicId,
        @PathVariable Long commentId
    ) {
        interactionService.unlikeComment(
            authentication.getName(),
            VideoPublicIds.parse(publicId),
            commentId
        );
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    @GetMapping("/videos/{publicId}/comments")
    public ApiResponse<List<CommentResponse>> getComments(
        @PathVariable String publicId,
        Authentication authentication
    ) {
        String viewerEmail = null;
        if (authentication != null
            && authentication.isAuthenticated()
            && !(authentication instanceof AnonymousAuthenticationToken)) {
            viewerEmail = authentication.getName();
        }
        return ApiResponse.success(
            interactionService.getComments(VideoPublicIds.parse(publicId), viewerEmail)
        );
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

    @GetMapping("/follows/friends")
    @PreAuthorize("hasRole('USER')")
    public ApiResponse<List<FriendMentionResponse>> getMentionableFriends(Authentication authentication) {
        return ApiResponse.success(interactionService.getMutualFriends(authentication.getName()));
    }

    @PostMapping("/videos/{publicId}/report")
    @PreAuthorize("hasRole('USER')")
    public ResponseEntity<ApiResponse<Void>> reportVideo(
        Authentication authentication,
        @PathVariable String publicId,
        @Valid @RequestBody ReportVideoRequest request
    ) {
        interactionService.reportVideo(
            authentication.getName(),
            VideoPublicIds.parse(publicId),
            request.getReason()
        );
        return ResponseEntity.ok(ApiResponse.success(null));
    }
}
