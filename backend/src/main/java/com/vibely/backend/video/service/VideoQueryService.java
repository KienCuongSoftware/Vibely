package com.vibely.backend.video.service;

import com.vibely.backend.common.NotFoundException;
import com.vibely.backend.user.entity.User;
import com.vibely.backend.user.repository.UserRepository;
import com.vibely.backend.video.Video;
import com.vibely.backend.video.VideoRepository;
import com.vibely.backend.video.VideoResponse;
import com.vibely.backend.video.VideoStatus;
import java.util.Objects;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class VideoQueryService {

    private final VideoRepository videoRepository;
    private final UserRepository userRepository;
    private final VideoResponseMapper responseMapper;
    private final VideoPrivacyAccessService privacyAccessService;

    public VideoQueryService(
        VideoRepository videoRepository,
        UserRepository userRepository,
        VideoResponseMapper responseMapper,
        VideoPrivacyAccessService privacyAccessService
    ) {
        this.videoRepository = videoRepository;
        this.userRepository = userRepository;
        this.responseMapper = responseMapper;
        this.privacyAccessService = privacyAccessService;
    }

    public Video getVideoByPublicIdOrThrow(UUID publicId) {
        return videoRepository.findByPublicId(publicId)
            .orElseThrow(() -> new NotFoundException("Không tìm thấy video"));
    }

    public Video getVideoOrThrow(Long id) {
        return videoRepository.findById(Objects.requireNonNull(id, "id"))
            .orElseThrow(() -> new NotFoundException("Không tìm thấy video"));
    }

    @Transactional(readOnly = true)
    public VideoResponse getVideoByPublicIdForViewer(UUID publicId, String viewerEmail) {
        return getVideoByIdForViewer(getVideoByPublicIdOrThrow(publicId).getId(), viewerEmail);
    }

    /**
     * READY videos respect per-video privacy. Non-READY (e.g. RAW) only for the author.
     */
    @Transactional(readOnly = true)
    public VideoResponse getVideoByIdForViewer(Long id, String viewerEmail) {
        Video video = getVideoOrThrow(id);
        if (video.getStatus() == VideoStatus.REMOVED) {
            throw new NotFoundException("Không tìm thấy video");
        }
        User viewer = resolveViewer(viewerEmail);
        if (video.getStatus() == VideoStatus.READY) {
            if (!privacyAccessService.canViewerWatch(video, viewer)) {
                throw new NotFoundException("Không tìm thấy video");
            }
            return responseMapper.toResponse(video, responseMapper.resolveFollowedByViewer(video, viewerEmail));
        }
        if (viewer == null || !Objects.equals(video.getAuthor().getId(), viewer.getId())) {
            throw new NotFoundException("Không tìm thấy video");
        }
        return responseMapper.toResponse(video);
    }

    private User resolveViewer(String viewerEmail) {
        if (viewerEmail == null || viewerEmail.isBlank()) {
            return null;
        }
        return userRepository.findByEmail(viewerEmail.trim()).orElse(null);
    }
}
