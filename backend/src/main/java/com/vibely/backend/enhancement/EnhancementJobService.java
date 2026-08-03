package com.vibely.backend.enhancement;

import com.vibely.backend.common.NotFoundException;
import com.vibely.backend.video.Video;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class EnhancementJobService {

    private final EnhancementJobRepository jobRepository;
    private final VideoVersionRepository versionRepository;
    private final EnhancementProperties properties;

    public EnhancementJobService(
        EnhancementJobRepository jobRepository,
        VideoVersionRepository versionRepository,
        EnhancementProperties properties
    ) {
        this.jobRepository = jobRepository;
        this.versionRepository = versionRepository;
        this.properties = properties;
    }

    @Transactional
    public Optional<EnhanceClaimResponse> claimNext(String workerId) {
        Optional<UUID> lockedId = jobRepository.lockNextPendingJobId();
        if (lockedId.isEmpty()) {
            return Optional.empty();
        }
        return markClaimed(lockedId.get(), workerId);
    }

    @Transactional
    public Optional<EnhanceClaimResponse> claimById(UUID jobId, String workerId) {
        EnhancementJobEntity job = jobRepository
            .findWithVideoAndAuthorById(jobId)
            .orElseThrow(() -> new NotFoundException("Enhancement job không tồn tại"));
        if (job.getState() != EnhancementJobState.PENDING
            && job.getState() != EnhancementJobState.QUEUED
            && job.getState() != EnhancementJobState.RETRYING) {
            return Optional.empty();
        }
        return markClaimed(jobId, workerId);
    }

    private Optional<EnhanceClaimResponse> markClaimed(UUID jobId, String workerId) {
        EnhancementJobEntity job = jobRepository
            .findWithVideoAndAuthorById(jobId)
            .orElseThrow(() -> new NotFoundException("Enhancement job không tồn tại"));
        Video video = job.getVideo();
        Instant now = Instant.now();
        job.setState(EnhancementJobState.DOWNLOADING);
        job.setAttempts(job.getAttempts() + 1);
        job.setLeaseOwner(workerId == null || workerId.isBlank() ? "enhance-worker" : workerId);
        job.setLeaseUntil(now.plus(properties.getLeaseMinutes(), ChronoUnit.MINUTES));
        job.setStartedAt(now);
        job.setProgressPct(1);
        job.setProgressStage("DOWNLOAD");
        job.setLastError(null);
        job.setErrorCode(null);
        jobRepository.save(job);
        ensureStandardVersion(video);
        return Optional.of(
            new EnhanceClaimResponse(
                job.getId().toString(),
                video.getId(),
                video.getPublicId() == null ? null : video.getPublicId().toString(),
                video.getAuthor() == null ? null : video.getAuthor().getId(),
                video.getVideoUrl(),
                job.getTargetProfile(),
                job.getEnhancementLevel(),
                properties.getDefaultEngine(),
                job.getStagingPrefix(),
                video.getSourceWidthPx(),
                video.getSourceHeightPx(),
                job.getAttempts(),
                job.getCheckpointJson()
            )
        );
    }

    private void ensureStandardVersion(Video video) {
        ensureStandardVersionPublic(video);
    }

    @Transactional
    public void ensureStandardVersionPublic(Video video) {
        List<VideoVersionEntity> existing = versionRepository.findByVideo_IdAndKindAndProfileAndStatus(
            video.getId(),
            VideoVersionKind.STANDARD,
            "SOURCE_LADDER",
            VideoVersionStatus.ACTIVE
        );
        if (!existing.isEmpty()) {
            return;
        }
        if (video.getMasterPlaylistUrl() == null || video.getMasterPlaylistUrl().isBlank()) {
            return;
        }
        VideoVersionEntity version = new VideoVersionEntity();
        version.setVideo(video);
        version.setKind(VideoVersionKind.STANDARD);
        version.setProfile("SOURCE_LADDER");
        version.setLabel("Standard");
        version.setMasterPlaylistUrl(video.getMasterPlaylistUrl());
        version.setWidthPx(video.getSourceWidthPx());
        version.setHeightPx(video.getSourceHeightPx());
        version.setStatus(VideoVersionStatus.ACTIVE);
        versionRepository.save(version);
    }

    @Transactional(readOnly = true)
    public VideoVersionEntity findBestAiVersion(Long videoId) {
        return versionRepository
            .findByVideo_IdAndStatusOrderByCreatedAtDesc(videoId, VideoVersionStatus.ACTIVE)
            .stream()
            .filter(v -> v.getKind() == VideoVersionKind.AI_ENHANCED)
            .filter(v -> v.getMasterPlaylistUrl() != null && !v.getMasterPlaylistUrl().isBlank())
            .findFirst()
            .orElse(null);
    }

    @Transactional
    public void updateProgress(UUID jobId, EnhanceProgressRequest request) {
        EnhancementJobEntity job = jobRepository
            .findById(jobId)
            .orElseThrow(() -> new NotFoundException("Enhancement job không tồn tại"));
        if (request.progressPct() != null) {
            job.setProgressPct(Math.max(0, Math.min(100, request.progressPct())));
        }
        if (request.progressStage() != null) {
            job.setProgressStage(request.progressStage());
        }
        if (request.progressDetail() != null) {
            job.setProgressDetail(request.progressDetail());
        }
        if (request.checkpointJson() != null) {
            job.setCheckpointJson(request.checkpointJson());
        }
        if (request.state() != null && !request.state().isBlank()) {
            try {
                EnhancementJobState next = EnhancementJobState.valueOf(request.state().trim().toUpperCase());
                if (next != EnhancementJobState.COMPLETED && next != EnhancementJobState.DEAD) {
                    job.setState(next);
                }
            } catch (IllegalArgumentException ignored) {
                // keep current
            }
        }
        job.setLeaseUntil(Instant.now().plus(properties.getLeaseMinutes(), ChronoUnit.MINUTES));
        jobRepository.save(job);
    }

    @Transactional
    public void complete(UUID jobId, EnhanceCompleteRequest request) {
        EnhancementJobEntity job = jobRepository
            .findWithVideoAndAuthorById(jobId)
            .orElseThrow(() -> new NotFoundException("Enhancement job không tồn tại"));
        if (job.getState() == EnhancementJobState.COMPLETED) {
            return;
        }
        Video video = job.getVideo();

        versionRepository
            .findByVideo_IdAndKindAndProfileAndStatus(
                video.getId(),
                VideoVersionKind.AI_ENHANCED,
                job.getTargetProfile(),
                VideoVersionStatus.ACTIVE
            )
            .forEach(v -> {
                v.setStatus(VideoVersionStatus.SUPERSEDED);
                versionRepository.save(v);
            });

        VideoVersionEntity version = new VideoVersionEntity();
        version.setVideo(video);
        version.setKind(VideoVersionKind.AI_ENHANCED);
        version.setProfile(job.getTargetProfile());
        version.setLabel(
            request.label() == null || request.label().isBlank()
                ? labelForProfile(job.getTargetProfile())
                : request.label()
        );
        version.setMasterPlaylistUrl(request.masterPlaylistUrl());
        version.setStoragePrefix(request.storagePrefix());
        version.setWidthPx(request.widthPx());
        version.setHeightPx(request.heightPx());
        version.setStatus(VideoVersionStatus.ACTIVE);
        version.setCreatedFromJobId(job.getId());
        versionRepository.save(version);

        job.setOutputVersionId(version.getId());
        job.setModelName(request.modelName());
        job.setModelVersion(request.modelVersion());
        job.setState(EnhancementJobState.COMPLETED);
        job.setProgressPct(100);
        job.setProgressStage("COMPLETED");
        job.setFinishedAt(Instant.now());
        job.setLeaseOwner(null);
        job.setLeaseUntil(null);
        jobRepository.save(job);
    }

    @Transactional
    public void fail(UUID jobId, String errorMessage, String errorCode, boolean retryable) {
        EnhancementJobEntity job = jobRepository
            .findById(jobId)
            .orElseThrow(() -> new NotFoundException("Enhancement job không tồn tại"));
        job.setLastError(errorMessage == null ? "unknown" : errorMessage.substring(0, Math.min(errorMessage.length(), 1900)));
        job.setErrorCode(errorCode);
        job.setLeaseOwner(null);
        job.setLeaseUntil(null);
        if (retryable && job.getAttempts() < job.getMaxAttempts()) {
            job.setState(EnhancementJobState.RETRYING);
            job.setProgressStage("RETRYING");
        } else {
            job.setState(retryable ? EnhancementJobState.DEAD : EnhancementJobState.FAILED);
            job.setFinishedAt(Instant.now());
        }
        jobRepository.save(job);
        if (job.getState() == EnhancementJobState.RETRYING) {
            job.setState(EnhancementJobState.QUEUED);
            job.setQueuedAt(Instant.now());
            jobRepository.save(job);
        }
    }

    @Transactional(readOnly = true)
    public List<VideoVersionEntity> listActiveVersions(Long videoId) {
        return versionRepository.findByVideo_IdAndStatusOrderByCreatedAtDesc(videoId, VideoVersionStatus.ACTIVE);
    }

    @Transactional(readOnly = true)
    public EnhancementJobEntity requireJob(UUID jobId) {
        return jobRepository
            .findWithVideoAndAuthorById(jobId)
            .orElseThrow(() -> new NotFoundException("Enhancement job không tồn tại"));
    }

    private static String labelForProfile(String profile) {
        return switch (profile == null ? "" : profile) {
            case "AI_1080" -> "1080p AI";
            case "AI_1440" -> "1440p AI";
            case "AI_2160" -> "2160p AI";
            default -> "AI Enhanced";
        };
    }
}
