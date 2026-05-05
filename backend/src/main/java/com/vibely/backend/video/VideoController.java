package com.vibely.backend.video;

import com.vibely.backend.common.ApiResponse;
import com.vibely.backend.storage.PresignedUploadResponse;
import com.vibely.backend.storage.S3PresignedUploadService;
import com.vibely.backend.storage.VideoPresignRequest;
import jakarta.validation.Valid;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
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

    @PostMapping("/{videoId}/views")
    public ApiResponse<Void> recordView(@PathVariable Long videoId) {
        videoService.recordView(videoId);
        return ApiResponse.success(null);
    }
}
