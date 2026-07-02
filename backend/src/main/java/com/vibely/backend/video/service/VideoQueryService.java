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

    public VideoQueryService(
        VideoRepository videoRepository,
        UserRepository userRepository,
        VideoResponseMapper responseMapper
    ) {
        this.videoRepository = videoRepository;
        this.userRepository = userRepository;
        this.responseMapper = responseMapper;
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
     * Public: READY for everyone. Other statuses (e.g. RAW) only for the author when viewerEmail is set.
     */
    @Transactional(readOnly = true)
    public VideoResponse getVideoByIdForViewer(Long id, String viewerEmail) {
        Video video = getVideoOrThrow(id);
        if (video.getStatus() == VideoStatus.REMOVED) {
            throw new NotFoundException("Không tìm thấy video");
        }
        if (video.getStatus() == VideoStatus.READY) {
            return responseMapper.toResponse(video, responseMapper.resolveFollowedByViewer(video, viewerEmail));
        }
        if (viewerEmail == null || viewerEmail.isBlank()) {
            throw new NotFoundException("Không tìm thấy video");
        }
        User viewer = userRepository.findByEmail(viewerEmail.trim())
            .orElseThrow(() -> new NotFoundException("Không tìm thấy video"));
        if (!Objects.equals(video.getAuthor().getId(), viewer.getId())) {
            throw new NotFoundException("Không tìm thấy video");
        }
        return responseMapper.toResponse(video);
    }
}
