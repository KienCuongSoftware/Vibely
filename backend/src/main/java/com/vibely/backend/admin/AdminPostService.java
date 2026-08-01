package com.vibely.backend.admin;

import com.vibely.backend.common.BadRequestException;
import com.vibely.backend.common.NotFoundException;
import com.vibely.backend.common.SqlSafe;
import com.vibely.backend.interaction.repository.CommentRepository;
import com.vibely.backend.interaction.repository.LikeRepository;
import com.vibely.backend.interaction.repository.VideoBookmarkRepository;
import com.vibely.backend.interaction.repository.VideoViewRepository;
import com.vibely.backend.notification.NotificationService;
import com.vibely.backend.moderation.ModerationReviewQueueCleanupService;
import com.vibely.backend.processing.VideoProcessingJobRepository;
import com.vibely.backend.processing.VideoProcessingJobState;
import com.vibely.backend.storage.S3MediaDeletionService;
import com.vibely.backend.video.Video;
import com.vibely.backend.video.VideoRepository;
import com.vibely.backend.video.VideoStatus;
import java.util.Collection;
import java.util.Locale;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

@Service
public class AdminPostService {

    private static final Logger log = LoggerFactory.getLogger(AdminPostService.class);

    private final VideoRepository videoRepository;
    private final LikeRepository likeRepository;
    private final CommentRepository commentRepository;
    private final VideoBookmarkRepository videoBookmarkRepository;
    private final VideoViewRepository videoViewRepository;
    private final VideoProcessingJobRepository videoProcessingJobRepository;
    private final ObjectProvider<S3MediaDeletionService> s3MediaDeletionService;
    private final NotificationService notificationService;
    private final ModerationReviewQueueCleanupService reviewQueueCleanupService;

    public AdminPostService(
        VideoRepository videoRepository,
        LikeRepository likeRepository,
        CommentRepository commentRepository,
        VideoBookmarkRepository videoBookmarkRepository,
        VideoViewRepository videoViewRepository,
        VideoProcessingJobRepository videoProcessingJobRepository,
        ObjectProvider<S3MediaDeletionService> s3MediaDeletionService,
        NotificationService notificationService,
        ModerationReviewQueueCleanupService reviewQueueCleanupService
    ) {
        this.videoRepository = videoRepository;
        this.likeRepository = likeRepository;
        this.commentRepository = commentRepository;
        this.videoBookmarkRepository = videoBookmarkRepository;
        this.videoViewRepository = videoViewRepository;
        this.videoProcessingJobRepository = videoProcessingJobRepository;
        this.s3MediaDeletionService = s3MediaDeletionService;
        this.notificationService = notificationService;
        this.reviewQueueCleanupService = reviewQueueCleanupService;
    }

    @Transactional(readOnly = true)
    public AdminPostPageResponse listPosts(int page, int size, String query, String status) {
        VideoStatus parsedStatus = parseStatus(status);
        String normalizedQuery = normalizeQuery(query);
        PageRequest pageable = SqlSafe.pageRequest(page, size, 100);
        Page<Video> result = parsedStatus == null
            ? videoRepository.findAdminPosts(normalizedQuery, pageable)
            : videoRepository.findAdminPostsByStatus(normalizedQuery, parsedStatus, pageable);
        Collection<Long> ids = result.getContent().stream().map(Video::getId).toList();
        Map<Long, Long> likeCounts = ids.isEmpty() ? Map.of() : groupedCounts(likeRepository.countGroupedByVideoIds(ids));
        Map<Long, Long> commentCounts = ids.isEmpty() ? Map.of() : groupedCounts(commentRepository.countGroupedByVideoIds(ids));
        Map<Long, Long> bookmarkCounts = ids.isEmpty() ? Map.of() : groupedCounts(videoBookmarkRepository.countGroupedByVideoIds(ids));
        Map<Long, Long> viewCounts = ids.isEmpty() ? Map.of() : groupedCounts(videoViewRepository.countGroupedByVideoIds(ids));

        return new AdminPostPageResponse(
            result.getContent().stream()
                .map(video -> toResponse(video, likeCounts, commentCounts, bookmarkCounts, viewCounts))
                .toList(),
            result.getTotalElements(),
            result.getNumber(),
            result.getSize(),
            result.hasNext()
        );
    }

    @Transactional
    public void deletePost(UUID publicId) {
        Video video = videoRepository.findWithAuthorByPublicId(publicId)
            .orElseThrow(() -> new NotFoundException("Không tìm thấy bài đăng"));

        // Already soft-removed: purge DB row so it disappears from admin list.
        // S3 wipe is best-effort (media may already be missing).
        if (video.getStatus() == VideoStatus.REMOVED) {
            purgePermanently(video);
            return;
        }

        cancelProcessingJob(video.getId());
        // Soft-remove first: hide from profile/public URL, keep S3 for admin review.
        video.setStatus(VideoStatus.REMOVED);
        videoRepository.save(video);
        notificationService.purgeForRemovedVideo(video.getId());
        reviewQueueCleanupService.purgeForVideo(video.getId());
    }

    private void purgePermanently(Video video) {
        cancelProcessingJob(video.getId());
        reviewQueueCleanupService.purgeForVideo(video.getId());
        notificationService.purgeForRemovedVideo(video.getId());
        S3MediaDeletionService deletionService = s3MediaDeletionService.getIfAvailable();
        if (deletionService != null) {
            try {
                deletionService.deleteVideoArtifacts(video);
            } catch (Exception ex) {
                log.warn(
                    "Best-effort S3 cleanup failed for purged videoId={}: {}",
                    video.getId(),
                    ex.getMessage()
                );
            }
        }
        try {
            videoRepository.delete(video);
            videoRepository.flush();
        } catch (DataIntegrityViolationException ex) {
            throw new BadRequestException(
                "Không xóa vĩnh viễn được bài đăng vì còn dữ liệu liên quan. Thử lại hoặc liên hệ kỹ thuật."
            );
        }
    }

    @Transactional(readOnly = true)
    public AdminPostResponse getPost(UUID publicId) {
        Video video = videoRepository.findWithAuthorByPublicId(publicId)
            .orElseThrow(() -> new NotFoundException("Không tìm thấy bài đăng"));
        return toResponse(
            video,
            Map.of(video.getId(), likeRepository.countByVideoId(video.getId())),
            Map.of(video.getId(), commentRepository.countByVideoId(video.getId())),
            Map.of(video.getId(), videoBookmarkRepository.countByVideo_Id(video.getId())),
            Map.of(video.getId(), videoViewRepository.countByVideo_Id(video.getId()))
        );
    }

    private AdminPostResponse toResponse(
        Video video,
        Map<Long, Long> likeCounts,
        Map<Long, Long> commentCounts,
        Map<Long, Long> bookmarkCounts,
        Map<Long, Long> viewCounts
    ) {
        return new AdminPostResponse(
            video.getPublicId(),
            video.getTitle(),
            video.getDescription(),
            video.getThumbnailUrl(),
            video.getVideoUrl(),
            video.getStatus(),
            video.getAuthor().getId(),
            video.getAuthor().getUsername(),
            video.getAuthor().getDisplayName(),
            video.getAuthor().getEmail(),
            likeCounts.getOrDefault(video.getId(), 0L),
            commentCounts.getOrDefault(video.getId(), 0L),
            bookmarkCounts.getOrDefault(video.getId(), 0L),
            video.getShareCount(),
            viewCounts.getOrDefault(video.getId(), 0L),
            video.getCreatedAt()
        );
    }

    private VideoStatus parseStatus(String status) {
        if (!StringUtils.hasText(status) || "ALL".equalsIgnoreCase(status)) {
            return null;
        }
        return VideoStatus.valueOf(status.trim().toUpperCase(Locale.ROOT));
    }

    private String normalizeQuery(String query) {
        if (!StringUtils.hasText(query)) {
            return "";
        }
        return SqlSafe.sanitizeLikeTerm(query, 200);
    }

    private Map<Long, Long> groupedCounts(Collection<Object[]> rows) {
        return rows.stream().collect(Collectors.toMap(
            row -> ((Number) row[0]).longValue(),
            row -> ((Number) row[1]).longValue(),
            (left, right) -> left
        ));
    }

    private void cancelProcessingJob(Long videoId) {
        videoProcessingJobRepository.findByVideo_Id(videoId).ifPresent(job -> {
            if (job.getJobState() != VideoProcessingJobState.COMPLETED) {
                job.setJobState(VideoProcessingJobState.COMPLETED);
                videoProcessingJobRepository.save(job);
            }
        });
    }
}
