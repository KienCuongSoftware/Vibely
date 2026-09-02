package com.vibely.backend.video;

import com.vibely.backend.common.ApiResponse;
import com.vibely.backend.common.NotFoundException;
import com.vibely.backend.feed.dto.FeedPageResponse;
import com.vibely.backend.storage.MultipartAbortRequest;
import com.vibely.backend.storage.MultipartCompleteRequest;
import com.vibely.backend.storage.MultipartCompleteResponse;
import com.vibely.backend.storage.MultipartInitiateResponse;
import com.vibely.backend.storage.MultipartPresignPartsRequest;
import com.vibely.backend.storage.MultipartPresignPartsResponse;
import com.vibely.backend.storage.PresignedUploadResponse;
import com.vibely.backend.storage.S3PresignedUploadService;
import com.vibely.backend.storage.VideoPresignRequest;
import com.vibely.backend.video.download.VideoWatermarkDownloadService;
import com.vibely.backend.video.download.WatermarkedDownloadArtifact;
import com.vibely.backend.video.SoundBrowsePageResponse;
import com.vibely.backend.video.service.VideoService;
import jakarta.validation.Valid;
import java.nio.file.Path;
import java.util.UUID;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.servlet.mvc.method.annotation.StreamingResponseBody;
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
    private final ObjectProvider<VideoWatermarkDownloadService> watermarkDownloadService;

    public VideoController(
        VideoService videoService,
        ObjectProvider<S3PresignedUploadService> presignedUploadService,
        ObjectProvider<VideoWatermarkDownloadService> watermarkDownloadService
    ) {
        this.videoService = videoService;
        this.presignedUploadService = presignedUploadService;
        this.watermarkDownloadService = watermarkDownloadService;
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

    /** Distinct sounds from published videos — for Studio photo sound picker. */
    @GetMapping("/sounds")
    public ApiResponse<SoundBrowsePageResponse> browseSounds(
        @RequestParam(required = false) String q,
        @RequestParam(defaultValue = "0") int page,
        @RequestParam(defaultValue = "20") int size
    ) {
        return ApiResponse.success(videoService.browseSounds(q, page, size));
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

    @PostMapping("/{publicId}/retry-processing")
    @PreAuthorize("hasRole('USER')")
    public ApiResponse<VideoResponse> retryVideoProcessing(
        Authentication authentication,
        @PathVariable String publicId
    ) {
        return ApiResponse.success(
            videoService.retryVideoProcessing(authentication.getName(), VideoPublicIds.parse(publicId))
        );
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
        S3PresignedUploadService svc = requireS3UploadService(
            "S3 video upload is not enabled. Set APP_S3_ENABLED=true and AWS_S3_BUCKET."
        );
        return ApiResponse.success(svc.presign(authentication.getName(), request));
    }

    @PostMapping("/upload/presign-thumbnail")
    @PreAuthorize("hasRole('USER')")
    public ApiResponse<PresignedUploadResponse> presignThumbnailUpload(
        Authentication authentication,
        @Valid @RequestBody VideoPresignRequest request
    ) {
        S3PresignedUploadService svc = requireS3UploadService(
            "S3 image upload is not enabled. Set APP_S3_ENABLED=true and AWS_S3_BUCKET."
        );
        return ApiResponse.success(svc.presignThumbnail(authentication.getName(), request));
    }

    @PostMapping("/upload/multipart/initiate")
    @PreAuthorize("hasRole('USER')")
    public ApiResponse<MultipartInitiateResponse> initiateMultipartUpload(
        Authentication authentication,
        @Valid @RequestBody VideoPresignRequest request
    ) {
        S3PresignedUploadService svc = requireS3UploadService(
            "S3 video upload is not enabled. Set APP_S3_ENABLED=true and AWS_S3_BUCKET."
        );
        return ApiResponse.success(svc.initiateMultipart(authentication.getName(), request));
    }

    @PostMapping("/upload/multipart/presign-parts")
    @PreAuthorize("hasRole('USER')")
    public ApiResponse<MultipartPresignPartsResponse> presignMultipartParts(
        Authentication authentication,
        @Valid @RequestBody MultipartPresignPartsRequest request
    ) {
        S3PresignedUploadService svc = requireS3UploadService(
            "S3 video upload is not enabled. Set APP_S3_ENABLED=true and AWS_S3_BUCKET."
        );
        return ApiResponse.success(svc.presignMultipartParts(authentication.getName(), request));
    }

    @PostMapping("/upload/multipart/complete")
    @PreAuthorize("hasRole('USER')")
    public ApiResponse<MultipartCompleteResponse> completeMultipartUpload(
        Authentication authentication,
        @Valid @RequestBody MultipartCompleteRequest request
    ) {
        S3PresignedUploadService svc = requireS3UploadService(
            "S3 video upload is not enabled. Set APP_S3_ENABLED=true and AWS_S3_BUCKET."
        );
        return ApiResponse.success(svc.completeMultipart(authentication.getName(), request));
    }

    @PostMapping("/upload/multipart/abort")
    @PreAuthorize("hasRole('USER')")
    public ApiResponse<Void> abortMultipartUpload(
        Authentication authentication,
        @Valid @RequestBody MultipartAbortRequest request
    ) {
        S3PresignedUploadService svc = requireS3UploadService(
            "S3 video upload is not enabled. Set APP_S3_ENABLED=true and AWS_S3_BUCKET."
        );
        svc.abortMultipart(authentication.getName(), request);
        return ApiResponse.success(null);
    }

    private S3PresignedUploadService requireS3UploadService(String unavailableMessage) {
        S3PresignedUploadService svc = presignedUploadService.getIfAvailable();
        if (svc == null) {
            throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE, unavailableMessage);
        }
        return svc;
    }

    @PostMapping("/{publicId}/views")
    public ApiResponse<Void> recordView(
        Authentication authentication,
        @PathVariable String publicId,
        @RequestBody(required = false) VideoViewRequest body
    ) {
        String viewerEmail = authentication != null && !(authentication instanceof AnonymousAuthenticationToken)
            ? authentication.getName()
            : null;
        videoService.recordView(VideoPublicIds.parse(publicId), body, viewerEmail);
        return ApiResponse.success(null);
    }

    @PostMapping("/{publicId}/shares")
    public ApiResponse<Void> recordShare(
        Authentication authentication,
        @PathVariable String publicId
    ) {
        String viewerEmail = authentication != null && !(authentication instanceof AnonymousAuthenticationToken)
            ? authentication.getName()
            : null;
        videoService.recordShare(VideoPublicIds.parse(publicId), viewerEmail);
        return ApiResponse.success(null);
    }

    /**
     * MP4 tải về có watermark logo Vibely + @username (TikTok-style).
     */
    @GetMapping("/{publicId}/download")
    public ResponseEntity<StreamingResponseBody> downloadWatermarkedVideo(
        Authentication authentication,
        @PathVariable String publicId
    ) {
        VideoWatermarkDownloadService svc = watermarkDownloadService.getIfAvailable();
        if (svc == null) {
            throw new ResponseStatusException(
                HttpStatus.SERVICE_UNAVAILABLE,
                "Video upload is not enabled in this environment."
            );
        }
        UUID videoPublicId = VideoPublicIds.parse(publicId);
        String viewerEmail = null;
        if (authentication != null
            && authentication.isAuthenticated()
            && !(authentication instanceof AnonymousAuthenticationToken)) {
            viewerEmail = authentication.getName();
        }
        final WatermarkedDownloadArtifact artifact;
        try {
            artifact = svc.resolveWatermarkedDownload(videoPublicId, viewerEmail);
        } catch (NotFoundException e) {
            throw e;
        } catch (Exception e) {
            throw new ResponseStatusException(
                HttpStatus.INTERNAL_SERVER_ERROR,
                e.getMessage() != null ? e.getMessage() : "Could not create a downloadable video."
            );
        }
        Path workRoot = artifact.workRoot();
        StreamingResponseBody body = out -> {
            try {
                svc.streamArtifact(artifact, out);
            } finally {
                VideoWatermarkDownloadService.deleteRecursively(workRoot);
            }
        };
        String filename = "vibely-" + publicId + ".mp4";
        return ResponseEntity.ok()
            .header(
                HttpHeaders.CONTENT_DISPOSITION,
                ContentDisposition.attachment().filename(filename).build().toString()
            )
            .contentType(MediaType.parseMediaType("video/mp4"))
            .body(body);
    }
}
