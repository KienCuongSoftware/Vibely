package com.vibely.backend.enhancement;

import com.vibely.backend.common.ApiResponse;
import com.vibely.backend.common.BadRequestException;
import com.vibely.backend.common.NotFoundException;
import com.vibely.backend.storage.MediaUrlPresigner;
import com.vibely.backend.user.entity.User;
import com.vibely.backend.user.repository.UserRepository;
import com.vibely.backend.video.Video;
import com.vibely.backend.video.VideoPublicIds;
import com.vibely.backend.video.VideoRepository;
import com.vibely.backend.video.service.VideoPrivacyAccessService;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/videos")
public class VideoEnhancementVersionsController {

    private final EnhancementJobService jobService;
    private final VideoRepository videoRepository;
    private final UserRepository userRepository;
    private final VideoPrivacyAccessService privacyAccessService;
    private final MediaUrlPresigner mediaUrlPresigner;

    public VideoEnhancementVersionsController(
        EnhancementJobService jobService,
        VideoRepository videoRepository,
        UserRepository userRepository,
        VideoPrivacyAccessService privacyAccessService,
        MediaUrlPresigner mediaUrlPresigner
    ) {
        this.jobService = jobService;
        this.videoRepository = videoRepository;
        this.userRepository = userRepository;
        this.privacyAccessService = privacyAccessService;
        this.mediaUrlPresigner = mediaUrlPresigner;
    }

    @GetMapping("/{publicId}/versions")
    public ApiResponse<List<Map<String, Object>>> versions(
        @PathVariable String publicId,
        Authentication authentication
    ) {
        UUID parsedId;
        try {
            parsedId = VideoPublicIds.parse(publicId);
        } catch (BadRequestException ex) {
            throw new NotFoundException("Video not found");
        }
        Video video = videoRepository.findByPublicId(parsedId)
            .orElseThrow(() -> new NotFoundException("Video not found"));
        User viewer = null;
        if (authentication != null
            && authentication.isAuthenticated()
            && authentication.getName() != null
            && !authentication.getName().isBlank()) {
            viewer = userRepository.findByEmail(authentication.getName()).orElse(null);
        }
        if (!privacyAccessService.canViewerWatch(video, viewer)) {
            throw new NotFoundException("Video not found");
        }
        List<Map<String, Object>> rows = jobService.listActiveVersions(video.getId()).stream().map(v -> {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("id", v.getId());
            m.put("kind", v.getKind().name());
            m.put("profile", v.getProfile());
            m.put("label", v.getLabel());
            m.put("masterPlaylistUrl", mediaUrlPresigner.presignPlaybackUrl(v.getMasterPlaylistUrl()));
            m.put("widthPx", v.getWidthPx());
            m.put("heightPx", v.getHeightPx());
            m.put("aiEnhanced", v.getKind() == VideoVersionKind.AI_ENHANCED);
            return m;
        }).toList();
        return ApiResponse.success(rows);
    }
}
