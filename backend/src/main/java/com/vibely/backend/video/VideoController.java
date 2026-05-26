package com.vibely.backend.video;

import com.vibely.backend.common.ApiResponse;
import com.vibely.backend.feed.FeedPageResponse;
import com.vibely.backend.storage.PresignedUploadResponse;
import com.vibely.backend.storage.S3PresignedUploadService;
import com.vibely.backend.storage.VideoPresignRequest;
import jakarta.validation.Valid;
import java.util.UUID;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.authentication.AnonymousAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api/videos")
public class VideoController {

    private final VideoService videoService;
    private final ObjectProvider<S3PresignedUploadService> presignedUploadService;

    public VideoController(
        VideoService videoService,
        ObjectProvider<S3PresignedUploadService> presignedUploadService
    ) {
        this.videoService = videoService;
        this.presignedUploadService = presignedUploadService;
    }

    @PostMapping
    @PreAuthorize("hasRole('USER')")
    public ApiResponse<VideoResponse> createVideo(
        Authentication authentication,
        @Valid @RequestBody VideoCreateRequest request
    ) {
        return ApiResponse.success(videoService.createVideo(authentication.getName(), request));
    }

    @GetMapping("/{publicId}")
    public ApiResponse<VideoResponse> getVideo(
        @PathVariable String publicId,
        Authentication authentication
    ) {
        UUID videoPublicId = VideoPublicIds.parse(publicId);
        String viewerEmail = null;
        if (authentication != null
            && authentication.isAuthenticated()
            && !(authentication instanceof AnonymousAuthenticationToken)) {
            viewerEmail = authentication.getName();
        }
        return ApiResponse.success(videoService.getVideoByPublicIdForViewer(videoPublicId, viewerEmail));
    }

    @GetMapping("/sound")
    public ApiResponse<FeedPageResponse> getVideosBySound(
        @RequestParam String audioUrl,
        @RequestParam(defaultValue = "0") int page,
        @RequestParam(defaultValue = "24") int size
    ) {
        return ApiResponse.success(videoService.getVideosByAudio(audioUrl, page, size));
    }

    @GetMapping("/hashtag")
    public ApiResponse<FeedPageResponse> getVideosByHashtag(
        @RequestParam String tag,
        @RequestParam(defaultValue = "0") int page,
        @RequestParam(defaultValue = "24") int size
    ) {
        return ApiResponse.success(videoService.getVideosByHashtag(tag, page, size));
    }

    @PutMapping("/{publicId}")
    @PreAuthorize("hasRole('USER')")
    public ApiResponse<VideoResponse> updateVideo(
        Authentication authentication,
        @PathVariable String publicId,
        @Valid @RequestBody VideoUpdateRequest request
    ) {
        return ApiResponse.success(
            videoService.updateVideo(authentication.getName(), VideoPublicIds.parse(publicId), request)
        );
    }

    @DeleteMapping("/{publicId}")
    @PreAuthorize("hasRole('USER')")
    public ApiResponse<Void> deleteVideo(Authentication authentication, @PathVariable String publicId) {
        videoService.deleteVideo(authentication.getName(), VideoPublicIds.parse(publicId));
        return ApiResponse.success(null);
    }

    /**
     * Trả về URL ký sẵn để client PUT file trực tiếp lên S3, sau đó gọi POST /api/videos với playbackUrl.
     */
    @PostMapping("/upload/presign")
    @PreAuthorize("hasRole('USER')")
    public ApiResponse<PresignedUploadResponse> presignUpload(
        Authentication authentication,
        @Valid @RequestBody VideoPresignRequest request
    ) {
        S3PresignedUploadService svc = presignedUploadService.getIfAvailable();
        if (svc == null) {
            throw new ResponseStatusException(
                HttpStatus.SERVICE_UNAVAILABLE,
                "Tải video qua S3 chưa được bật. Đặt APP_S3_ENABLED=true và AWS_S3_BUCKET."
            );
        }
        return ApiResponse.success(svc.presign(authentication.getName(), request));
    }

    @PostMapping("/upload/presign-thumbnail")
    @PreAuthorize("hasRole('USER')")
    public ApiResponse<PresignedUploadResponse> presignThumbnailUpload(
        Authentication authentication,
        @Valid @RequestBody VideoPresignRequest request
    ) {
        S3PresignedUploadService svc = presignedUploadService.getIfAvailable();
        if (svc == null) {
            throw new ResponseStatusException(
                HttpStatus.SERVICE_UNAVAILABLE,
                "Tải ảnh qua S3 chưa được bật. Đặt APP_S3_ENABLED=true và AWS_S3_BUCKET."
            );
        }
        return ApiResponse.success(svc.presignThumbnail(authentication.getName(), request));
    }

    @PostMapping("/{publicId}/views")
    public ApiResponse<Void> recordView(
        @PathVariable String publicId,
        @RequestBody(required = false) VideoViewRequest body
    ) {
        videoService.recordView(VideoPublicIds.parse(publicId), body);
        return ApiResponse.success(null);
    }

    @PostMapping("/{publicId}/shares")
    public ApiResponse<Void> recordShare(@PathVariable String publicId) {
        videoService.recordShare(VideoPublicIds.parse(publicId));
        return ApiResponse.success(null);
    }
}
