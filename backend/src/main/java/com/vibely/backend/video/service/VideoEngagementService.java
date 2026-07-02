package com.vibely.backend.video.service;

import com.vibely.backend.discovery.service.UserInterestSignalProcessor;
import com.vibely.backend.discovery.service.VideoEngagementStatsService;
import com.vibely.backend.explore.service.ExploreCacheService;
import com.vibely.backend.interaction.entity.VideoViewEntity;
import com.vibely.backend.interaction.repository.VideoViewRepository;
import com.vibely.backend.user.entity.User;
import com.vibely.backend.user.repository.UserRepository;
import com.vibely.backend.video.Video;
import com.vibely.backend.video.VideoRepository;
import com.vibely.backend.video.VideoStatus;
import com.vibely.backend.video.VideoViewRequest;
import java.util.UUID;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class VideoEngagementService {

    /** Tối thiểu ~2s phát thật (sau upload/S3 + pipeline) — không tính chỉ impression trên feed. */
    private static final long VIEW_MIN_PLAYED_MS = 2_000L;
    private static final long VIEW_MIN_CLIENT_MS = 500L;
    private static final long VIEW_SANITY_MAX_MS = 3_600_000L;
    /** Clip ngắn hơn 2s: cần ≥ 25% duration (ms). */
    private static final int SHORT_CLIP_QUALIFY_PERCENT = 25;

    private final VideoQueryService queryService;
    private final VideoRepository videoRepository;
    private final VideoViewRepository videoViewRepository;
    private final UserRepository userRepository;
    private final ExploreCacheService exploreCacheService;
    private final ObjectProvider<UserInterestSignalProcessor> userInterestSignalProcessor;
    private final ObjectProvider<VideoEngagementStatsService> videoEngagementStatsService;

    public VideoEngagementService(
        VideoQueryService queryService,
        VideoRepository videoRepository,
        VideoViewRepository videoViewRepository,
        UserRepository userRepository,
        ExploreCacheService exploreCacheService,
        ObjectProvider<UserInterestSignalProcessor> userInterestSignalProcessor,
        ObjectProvider<VideoEngagementStatsService> videoEngagementStatsService
    ) {
        this.queryService = queryService;
        this.videoRepository = videoRepository;
        this.videoViewRepository = videoViewRepository;
        this.userRepository = userRepository;
        this.exploreCacheService = exploreCacheService;
        this.userInterestSignalProcessor = userInterestSignalProcessor;
        this.videoEngagementStatsService = videoEngagementStatsService;
    }

    @Transactional
    public void recordView(UUID publicId, VideoViewRequest body) {
        recordView(publicId, body, null);
    }

    @Transactional
    public void recordView(UUID publicId, VideoViewRequest body, String viewerEmail) {
        recordView(queryService.getVideoByPublicIdOrThrow(publicId).getId(), body, viewerEmail);
    }

    @Transactional
    public void recordView(Long id, VideoViewRequest body) {
        recordView(id, body, null);
    }

    /**
     * Ghi một lượt xem đủ thời lượng phát (client gửi watchedMs từ trình phát).
     * Mọi trạng thái trừ REMOVED. Body thiếu hoặc không đạt ngưỡng: bỏ qua (200, không tăng đếm).
     */
    @Transactional
    public void recordView(Long id, VideoViewRequest body, String viewerEmail) {
        if (body == null || !qualifiesPlaybackForView(body.watchedMs(), body.durationMs())) {
            return;
        }
        Video target = queryService.getVideoOrThrow(id);
        if (target.getStatus() == VideoStatus.REMOVED) {
            return;
        }
        VideoViewEntity row = new VideoViewEntity();
        row.setVideo(target);
        row.setWatchedMs(body.watchedMs());
        row.setDurationMs(body.durationMs());
        videoViewRepository.save(row);
        Long viewerId = resolveViewerId(viewerEmail);
        if (viewerId != null) {
            userInterestSignalProcessor.ifAvailable(p ->
                p.onView(viewerId, target, body.watchedMs(), body.durationMs())
            );
        }
        videoEngagementStatsService.ifAvailable(s -> s.recomputeSafely(target));
        evictExploreCaches(target);
    }

    @Transactional
    public void recordShare(UUID publicId) {
        recordShare(publicId, null);
    }

    @Transactional
    public void recordShare(UUID publicId, String viewerEmail) {
        recordShare(queryService.getVideoByPublicIdOrThrow(publicId).getId(), viewerEmail);
    }

    @Transactional
    public void recordShare(Long videoId) {
        recordShare(videoId, null);
    }

    @Transactional
    public void recordShare(Long videoId, String viewerEmail) {
        videoRepository.incrementShareCount(videoId, VideoStatus.READY);
        Video target = queryService.getVideoOrThrow(videoId);
        videoEngagementStatsService.ifAvailable(s -> s.recomputeSafely(target));
        Long viewerId = resolveViewerId(viewerEmail);
        if (viewerId != null) {
            userInterestSignalProcessor.ifAvailable(p -> p.onShare(viewerId, target));
        }
    }

    private static boolean qualifiesPlaybackForView(Long watchedMs, Long durationMs) {
        if (watchedMs == null || watchedMs < VIEW_MIN_CLIENT_MS) {
            return false;
        }
        if (watchedMs > VIEW_SANITY_MAX_MS) {
            return false;
        }
        long dur = durationMs != null && durationMs > 0 ? durationMs : 0L;
        if (dur > 0 && dur < VIEW_MIN_PLAYED_MS) {
            return watchedMs * 100L >= dur * SHORT_CLIP_QUALIFY_PERCENT;
        }
        return watchedMs >= VIEW_MIN_PLAYED_MS;
    }

    private Long resolveViewerId(String viewerEmail) {
        if (viewerEmail == null || viewerEmail.isBlank()) {
            return null;
        }
        return userRepository.findByEmail(viewerEmail.trim())
            .map(User::getId)
            .orElse(null);
    }

    private void evictExploreCaches(Video target) {
        exploreCacheService.evictByPrefix("trending");
        exploreCacheService.evictByPrefix("category:");
        exploreCacheService.evictByPrefix("related:" + target.getPublicId());
    }
}
