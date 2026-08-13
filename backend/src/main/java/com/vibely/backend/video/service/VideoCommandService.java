package com.vibely.backend.video.service;

import com.vibely.backend.contentunderstanding.ContentUnderstandingEnqueueService;
import com.vibely.backend.common.BadRequestException;
import com.vibely.backend.common.NotFoundException;
import com.vibely.backend.moderation.ModerationCaptionGateService;
import com.vibely.backend.moderation.ModerationJoinService;
import com.vibely.backend.moderation.ModerationPublicationHoldService;
import com.vibely.backend.moderation.ModerationReviewQueueCleanupService;
import com.vibely.backend.notification.NotificationService;
import com.vibely.backend.originality.OriginalityEnqueueService;
import com.vibely.backend.processing.VideoProcessingEnqueueService;
import com.vibely.backend.processing.VideoProcessingJobRepository;
import com.vibely.backend.processing.VideoProcessingJobState;
import com.vibely.backend.storage.S3MediaDeletionService;
import com.vibely.backend.storage.S3OwnedMediaValidator;
import com.vibely.backend.user.entity.User;
import com.vibely.backend.user.repository.UserRepository;
import com.vibely.backend.video.Video;
import com.vibely.backend.video.VideoCreateRequest;
import com.vibely.backend.video.VideoPrivacy;
import com.vibely.backend.video.VideoRepository;
import com.vibely.backend.video.VideoResponse;
import com.vibely.backend.video.VideoStatus;
import com.vibely.backend.video.VideoUpdateRequest;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Objects;
import java.util.UUID;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.stereotype.Service;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionTemplate;

@Service
public class VideoCommandService {

    private final VideoRepository videoRepository;
    private final UserRepository userRepository;
    private final VideoProcessingEnqueueService videoProcessingEnqueueService;
    private final OriginalityEnqueueService originalityEnqueueService;
    private final ContentUnderstandingEnqueueService contentUnderstandingEnqueueService;
    private final S3OwnedMediaValidator ownedMediaValidator;
    private final ObjectProvider<S3MediaDeletionService> s3MediaDeletionService;
    private final VideoExploreSyncService exploreSyncService;
    private final VideoResponseMapper responseMapper;
    private final VideoQueryService queryService;
    private final NotificationService notificationService;
    private final VideoProcessingJobRepository videoProcessingJobRepository;
    private final ModerationCaptionGateService captionGateService;
    private final ModerationJoinService moderationJoinService;
    private final ModerationPublicationHoldService publicationHoldService;
    private final ModerationReviewQueueCleanupService reviewQueueCleanupService;
    private final TransactionTemplate tx;

    public VideoCommandService(
        VideoRepository videoRepository,
        UserRepository userRepository,
        VideoProcessingEnqueueService videoProcessingEnqueueService,
        OriginalityEnqueueService originalityEnqueueService,
        ContentUnderstandingEnqueueService contentUnderstandingEnqueueService,
        S3OwnedMediaValidator ownedMediaValidator,
        ObjectProvider<S3MediaDeletionService> s3MediaDeletionService,
        VideoExploreSyncService exploreSyncService,
        VideoResponseMapper responseMapper,
        VideoQueryService queryService,
        NotificationService notificationService,
        VideoProcessingJobRepository videoProcessingJobRepository,
        ModerationCaptionGateService captionGateService,
        ModerationJoinService moderationJoinService,
        ModerationPublicationHoldService publicationHoldService,
        ModerationReviewQueueCleanupService reviewQueueCleanupService,
        PlatformTransactionManager transactionManager
    ) {
        this.videoRepository = videoRepository;
        this.userRepository = userRepository;
        this.videoProcessingEnqueueService = videoProcessingEnqueueService;
        this.originalityEnqueueService = originalityEnqueueService;
        this.contentUnderstandingEnqueueService = contentUnderstandingEnqueueService;
        this.ownedMediaValidator = ownedMediaValidator;
        this.s3MediaDeletionService = s3MediaDeletionService;
        this.exploreSyncService = exploreSyncService;
        this.responseMapper = responseMapper;
        this.queryService = queryService;
        this.notificationService = notificationService;
        this.videoProcessingJobRepository = videoProcessingJobRepository;
        this.captionGateService = captionGateService;
        this.moderationJoinService = moderationJoinService;
        this.publicationHoldService = publicationHoldService;
        this.reviewQueueCleanupService = reviewQueueCleanupService;
        this.tx = new TransactionTemplate(transactionManager);
    }

    public VideoResponse createVideo(String email, VideoCreateRequest request) {
        User author = userRepository.findByEmail(email)
            .orElseThrow(() -> new NotFoundException("Không tìm thấy người dùng"));
        long authorId = author.getId();
        Integer durationSeconds = request.getDurationSeconds();
        if (durationSeconds == null || durationSeconds <= 0) {
            throw new BadRequestException("Thiếu thời lượng video.");
        }
        if (durationSeconds > VideoCreateRequest.MAX_DURATION_SECONDS) {
            deleteOwnedUploadBestEffort(authorId, request.getVideoUrl(), request.getThumbnailUrl());
            throw new BadRequestException(
                "Video vượt quá thời lượng tối đa 60 phút. Vui lòng chọn video khác."
            );
        }
        ownedMediaValidator.requireOwnedUpload(request.getVideoUrl(), authorId);
        String thumb = VideoMediaUtils.normalizeText(request.getThumbnailUrl());
        if (thumb != null) {
            ownedMediaValidator.requireOwnedThumbnail(thumb, authorId);
        }
        String explicitAudio = VideoMediaUtils.normalizeText(request.getAudioUrl());
        if (explicitAudio != null) {
            ownedMediaValidator.requireOwnedAudio(explicitAudio, authorId);
        }
        // Default draft when omitted — only explicit studioDraft=false publishes into lists.
        boolean draft = !Boolean.FALSE.equals(request.getStudioDraft());
        Instant scheduledAt = resolveScheduledAtForPersist(request.getScheduledAt(), draft);
        // Caption gate BEFORE write TX so ACCOUNT_BANNED is not swallowed by rollback wrapping.
        if (!draft) {
            captionGateService.assertPublishAllowed(
                author.getId(),
                author.getEmail(),
                0L,
                request.getTitle(),
                request.getDescription()
            );
        }
        return tx.execute(status -> persistNewVideo(author, request, draft, durationSeconds, scheduledAt));
    }

    private VideoResponse persistNewVideo(
        User author,
        VideoCreateRequest request,
        boolean draft,
        int durationSeconds,
        Instant scheduledAt
    ) {
        User managedAuthor = userRepository.findById(author.getId())
            .orElseThrow(() -> new NotFoundException("Không tìm thấy người dùng"));
        Video video = new Video();
        video.setAuthor(managedAuthor);
        video.setTitle(request.getTitle());
        video.setDescription(request.getDescription());
        video.setVideoUrl(request.getVideoUrl());
        video.setThumbnailUrl(request.getThumbnailUrl());
        video.setDurationSeconds(durationSeconds);
        String audioUrl = VideoMediaUtils.normalizeText(request.getAudioUrl());
        if (audioUrl == null) {
            audioUrl = VideoMediaUtils.deriveAudioUrlFromVideoUrl(request.getVideoUrl());
        }
        video.setAudioUrl(audioUrl);
        String audioTitle = VideoMediaUtils.normalizeText(request.getAudioTitle());
        if (audioTitle == null) {
            audioTitle = "âm thanh gốc - " + VideoMediaUtils.resolveAuthorDisplayName(managedAuthor);
        }
        video.setAudioTitle(audioTitle);
        video.setStatus(VideoStatus.RAW);
        video.setStudioDraft(draft);
        video.setScheduledAt(scheduledAt);
        video.setPrivacy(resolvePrivacy(request.getPrivacy()));
        Video saved = videoRepository.save(video);
        if (!draft) {
            exploreSyncService.syncExploreSignals(saved);
        }
        videoProcessingEnqueueService.enqueueAfterVideoPersisted(saved);
        originalityEnqueueService.enqueueAfterVideoPersisted(saved);
        contentUnderstandingEnqueueService.enqueueAfterVideoPersisted(saved, "upload");
        if (!draft) {
            publicationHoldService.holdIfPendingModeration(saved);
            moderationJoinService.tryEnqueue(saved.getId(), false);
        }
        return responseMapper.toResponse(saved);
    }

    private void deleteOwnedUploadBestEffort(long authorId, String videoUrl, String thumbnailUrl) {
        S3MediaDeletionService deletionService = s3MediaDeletionService.getIfAvailable();
        if (deletionService == null) {
            return;
        }
        try {
            deletionService.deleteOwnedUploadMedia(authorId, videoUrl, thumbnailUrl);
        } catch (Exception ignored) {
            // Best-effort cleanup when rejecting over-duration uploads.
        }
    }

    public VideoResponse updateVideo(String email, UUID publicId, VideoUpdateRequest request) {
        return updateVideo(email, queryService.getVideoByPublicIdOrThrow(publicId).getId(), request);
    }

    public VideoResponse updateVideo(String email, Long videoId, VideoUpdateRequest request) {
        String nextTitle = request.getTitle().trim();
        String nextDesc = request.getDescription();
        nextDesc = nextDesc == null || nextDesc.isBlank() ? null : nextDesc.trim();
        boolean keepAsDraft = Boolean.TRUE.equals(request.getStudioDraft());
        Instant scheduledAt = null;
        if (keepAsDraft) {
            scheduledAt = null;
        } else if (request.isScheduledAtPresent()) {
            scheduledAt = resolveScheduledAtForPersist(request.getScheduledAt(), false);
        }

        UpdateGateProbe probe = tx.execute(status -> {
            User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new NotFoundException("Không tìm thấy người dùng"));
            Video video = queryService.getVideoOrThrow(videoId);
            if (!Objects.equals(video.getAuthor().getId(), user.getId())) {
                throw new BadRequestException("Bạn không có quyền sửa video này.");
            }
            if (video.getStatus() == VideoStatus.REMOVED) {
                throw new BadRequestException("Video đã bị gỡ, không thể sửa.");
            }
            return new UpdateGateProbe(
                video.getId(),
                video.getAuthor().getId(),
                video.getAuthor().getEmail(),
                video.isStudioDraft()
            );
        });

        // Caption gate only when publishing — draft saves must not ban for caption.
        if (!keepAsDraft) {
            captionGateService.assertPublishAllowed(
                probe.authorId(),
                probe.authorEmail(),
                probe.videoId(),
                nextTitle,
                nextDesc
            );
        }

        final String title = nextTitle;
        final String desc = nextDesc;
        final Instant schedule = scheduledAt;
        final boolean applySchedule = keepAsDraft || request.isScheduledAtPresent();
        return tx.execute(status ->
            applyVideoUpdate(email, probe, request, title, desc, keepAsDraft, schedule, applySchedule)
        );
    }

    private VideoResponse applyVideoUpdate(
        String email,
        UpdateGateProbe probe,
        VideoUpdateRequest request,
        String nextTitle,
        String nextDesc,
        boolean keepAsDraft,
        Instant scheduledAt,
        boolean applySchedule
    ) {
        User user = userRepository.findByEmail(email)
            .orElseThrow(() -> new NotFoundException("Không tìm thấy người dùng"));
        Video video = queryService.getVideoOrThrow(probe.videoId());
        if (!Objects.equals(video.getAuthor().getId(), user.getId())) {
            throw new BadRequestException("Bạn không có quyền sửa video này.");
        }
        if (video.getStatus() == VideoStatus.REMOVED) {
            throw new BadRequestException("Video đã bị gỡ, không thể sửa.");
        }
        boolean wasDraft = probe.wasDraft();
        video.setTitle(nextTitle);
        video.setDescription(nextDesc);
        if (request.getThumbnailUrl() != null) {
            String thumb = VideoMediaUtils.normalizeText(request.getThumbnailUrl());
            if (thumb != null) {
                ownedMediaValidator.requireOwnedThumbnail(thumb, user.getId());
            }
            video.setThumbnailUrl(request.getThumbnailUrl());
        }
        if (keepAsDraft) {
            video.setStudioDraft(true);
            video.setScheduledAt(null);
        } else {
            video.setStudioDraft(false);
            if (applySchedule) {
                video.setScheduledAt(scheduledAt);
            }
        }
        if (request.getPrivacy() != null && !request.getPrivacy().isBlank()) {
            video.setPrivacy(resolvePrivacy(request.getPrivacy()));
        }
        Video saved = videoRepository.save(video);
        // Hashtags / Explore signals follow description text on every metadata save.
        exploreSyncService.syncExploreSignals(saved);
        if (!keepAsDraft) {
            if (wasDraft) {
                originalityEnqueueService.enqueueAfterVideoPersisted(saved);
                contentUnderstandingEnqueueService.enqueueAfterVideoPersisted(saved, "publish");
            } else {
                contentUnderstandingEnqueueService.enqueueAfterVideoPersisted(saved, "metadata_updated");
            }
            // AI-first: keep off For You until moderation ALLOW/LIMIT; enqueue if CU+orig already done.
            publicationHoldService.holdIfPendingModeration(saved);
            moderationJoinService.tryEnqueue(saved.getId(), false);
        }
        return responseMapper.toResponse(saved);
    }

    /**
     * Drafts never keep a schedule. Non-draft with a time must be at least
     * {@link VideoCreateRequest#MIN_SCHEDULE_LEAD_MINUTES} ahead.
     */
    private Instant resolveScheduledAtForPersist(Instant scheduledAt, boolean draft) {
        if (draft || scheduledAt == null) {
            return null;
        }
        Instant minAllowed = Instant.now()
            .plus(VideoCreateRequest.MIN_SCHEDULE_LEAD_MINUTES, ChronoUnit.MINUTES);
        if (scheduledAt.isBefore(minAllowed)) {
            throw new BadRequestException(
                "Lên lịch trước ít nhất " + VideoCreateRequest.MIN_SCHEDULE_LEAD_MINUTES + " phút."
            );
        }
        return scheduledAt;
    }

    private record UpdateGateProbe(long videoId, Long authorId, String authorEmail, boolean wasDraft) {
    }

    private static VideoPrivacy resolvePrivacy(String raw) {
        if (raw == null || raw.isBlank()) {
            return VideoPrivacy.PUBLIC;
        }
        String trimmed = raw.trim();
        if ("everyone".equalsIgnoreCase(trimmed)
            || "friends".equalsIgnoreCase(trimmed)
            || "onlyYou".equalsIgnoreCase(trimmed)
            || "only_you".equalsIgnoreCase(trimmed)) {
            return VideoPrivacy.fromStudioUi(trimmed);
        }
        return VideoPrivacy.fromApi(trimmed);
    }

    @Transactional
    public void deleteVideo(String email, UUID publicId) {
        deleteVideo(email, queryService.getVideoByPublicIdOrThrow(publicId).getId());
    }

    @Transactional
    public void deleteVideo(String email, Long videoId) {
        User user = userRepository.findByEmail(email)
            .orElseThrow(() -> new NotFoundException("Không tìm thấy người dùng"));
        Video video = videoRepository.findWithAuthorById(videoId)
            .orElseThrow(() -> new NotFoundException("Không tìm thấy video"));
        if (!Objects.equals(video.getAuthor().getId(), user.getId())) {
            throw new BadRequestException("Bạn không có quyền xóa video này.");
        }
        if (video.getStatus() == VideoStatus.REMOVED) {
            return;
        }
        cancelProcessingJob(video.getId());
        S3MediaDeletionService deletionService = s3MediaDeletionService.getIfAvailable();
        if (deletionService != null) {
            try {
                deletionService.deleteVideoArtifacts(video);
            } catch (Exception ignored) {
                // Soft-remove still proceeds if S3 cleanup fails.
            }
        }
        // Soft-remove row; S3 objects above are deleted best-effort.
        video.setStatus(VideoStatus.REMOVED);
        videoRepository.save(video);
        notificationService.purgeForRemovedVideo(video.getId());
        reviewQueueCleanupService.purgeForVideo(video.getId());
        exploreSyncService.evictExploreCaches(video);
    }

    @Transactional
    public VideoResponse retryVideoProcessing(String email, UUID publicId) {
        User user = userRepository.findByEmail(email)
            .orElseThrow(() -> new NotFoundException("Không tìm thấy người dùng"));
        Video video = queryService.getVideoByPublicIdOrThrow(publicId);
        if (!Objects.equals(video.getAuthor().getId(), user.getId())) {
            throw new BadRequestException("Bạn không có quyền xử lý lại video này.");
        }
        if (video.getStatus() == VideoStatus.REMOVED) {
            throw new BadRequestException("Video đã bị gỡ.");
        }
        // Cho phép re-encode READY để áp ladder HLS mới (144p…4K).
        video.setStatus(VideoStatus.RAW);
        video.setProcessingError(null);
        videoRepository.save(video);
        videoProcessingEnqueueService.enqueueAfterVideoPersisted(video);
        return responseMapper.toResponseForViewer(video, email);
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
