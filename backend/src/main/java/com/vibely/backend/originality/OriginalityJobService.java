package com.vibely.backend.originality;

import com.vibely.backend.common.BadRequestException;
import com.vibely.backend.common.NotFoundException;
import com.vibely.backend.moderation.ModerationJoinService;
import com.vibely.backend.video.Video;
import com.vibely.backend.video.VideoRepository;
import java.time.LocalDateTime;
import java.util.Locale;
import java.util.Optional;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class OriginalityJobService {

    private static final Logger log = LoggerFactory.getLogger(OriginalityJobService.class);

    private final OriginalityJobRepository jobRepository;
    private final OriginalityReportRepository reportRepository;
    private final OriginalityMatchRepository matchRepository;
    private final VideoRepository videoRepository;
    private final OriginalityProperties properties;
    private final ObjectProvider<ModerationJoinService> moderationJoinService;

    public OriginalityJobService(
        OriginalityJobRepository jobRepository,
        OriginalityReportRepository reportRepository,
        OriginalityMatchRepository matchRepository,
        VideoRepository videoRepository,
        OriginalityProperties properties,
        ObjectProvider<ModerationJoinService> moderationJoinService
    ) {
        this.jobRepository = jobRepository;
        this.reportRepository = reportRepository;
        this.matchRepository = matchRepository;
        this.videoRepository = videoRepository;
        this.properties = properties;
        this.moderationJoinService = moderationJoinService;
    }

    @Transactional
    public Optional<OriginalityClaimResponse> claimNext() {
        Optional<Long> lockedId = jobRepository.lockNextPendingJobId();
        if (lockedId.isEmpty()) {
            return Optional.empty();
        }
        OriginalityJobEntity job = jobRepository
            .findWithVideoAndAuthorById(lockedId.get())
            .orElseThrow(() -> new NotFoundException("Originality job không tồn tại"));
        Video video = job.getVideo();
        job.setJobState(OriginalityJobState.PROCESSING);
        job.setClaimedAt(LocalDateTime.now());
        job.setAttempts(job.getAttempts() + 1);
        job.setLastError(null);
        jobRepository.save(job);
        return Optional.of(
            new OriginalityClaimResponse(
                job.getId(),
                video.getId(),
                video.getPublicId(),
                video.getAuthor().getId(),
                video.getVideoUrl(),
                video.getThumbnailUrl(),
                video.getDurationSeconds(),
                video.getTitle(),
                video.getDescription(),
                job.getPolicyVersion(),
                job.getAttempts()
            )
        );
    }

    @Transactional
    public void complete(long jobId, OriginalityCompleteRequest request) {
        OriginalityJobEntity job = jobRepository
            .findWithVideoAndAuthorById(jobId)
            .orElseThrow(() -> new NotFoundException("Originality job không tồn tại"));
        if (job.getJobState() == OriginalityJobState.COMPLETED) {
            log.info("Originality complete idempotent jobId={} already COMPLETED", jobId);
            return;
        }
        if (job.getJobState() != OriginalityJobState.PROCESSING
            && job.getJobState() != OriginalityJobState.PENDING) {
            throw new BadRequestException("Job originality không ở trạng thái có thể complete.");
        }
        Video video = job.getVideo();
        Video matched = null;
        if (request.getMatchedVideoId() != null) {
            matched = videoRepository.findById(request.getMatchedVideoId()).orElse(null);
            if (matched == null) {
                log.warn(
                    "Originality complete jobId={} ignoring unknown matchedVideoId={}",
                    jobId,
                    request.getMatchedVideoId()
                );
            }
        }

        OriginalityReportEntity report = reportRepository
            .findByVideo_Id(video.getId())
            .orElseGet(OriginalityReportEntity::new);
        report.setVideo(video);
        report.setJob(job);
        report.setPolicyVersion(job.getPolicyVersion());
        report.setOriginalityScore(request.getOriginalityScore());
        report.setVisualSimilarity(request.getVisualSimilarity());
        report.setAudioSimilarity(request.getAudioSimilarity());
        report.setOcrSimilarity(request.getOcrSimilarity());
        report.setWatermarkScore(request.getWatermarkScore());
        report.setMetadataScore(request.getMetadataScore());
        report.setSceneObjectScore(request.getSceneObjectScore());
        report.setOverallConfidence(request.getOverallConfidence());
        report.setRiskLevel(request.getRiskLevel());
        report.setDecision(request.getDecision());
        report.setMatchedVideo(matched);
        report.setExplainJson(request.getExplainJson());
        report.setModelVersions(request.getModelVersions());
        OriginalityReportEntity saved = reportRepository.save(report);

        if (saved.getId() != null) {
            matchRepository.deleteByReport_Id(saved.getId());
        }
        for (OriginalityCompleteRequest.MatchItem item : request.getMatches()) {
            if (item.getMatchedVideoId() == null) {
                continue;
            }
            Video matchVideo = videoRepository.findById(item.getMatchedVideoId()).orElse(null);
            if (matchVideo == null) {
                log.warn(
                    "Originality complete jobId={} skipping match videoId={}",
                    jobId,
                    item.getMatchedVideoId()
                );
                continue;
            }
            String modality = item.getModality() == null
                ? ""
                : item.getModality().trim().toUpperCase(Locale.ROOT);
            OriginalityMatchEntity row = new OriginalityMatchEntity();
            row.setReport(saved);
            row.setMatchedVideo(matchVideo);
            row.setModality(modality);
            row.setScore(item.getScore());
            row.setDetailJson(item.getDetailJson());
            matchRepository.save(row);
        }

        job.setJobState(OriginalityJobState.COMPLETED);
        job.setLastError(null);
        jobRepository.save(job);

        ModerationJoinService join = moderationJoinService.getIfAvailable();
        if (join != null) {
            join.onOriginalityCompleted(video.getId(), saved.getId());
        }
    }

    @Transactional
    public void fail(long jobId, String errorMessage) {
        OriginalityJobEntity job = jobRepository
            .findById(jobId)
            .orElseThrow(() -> new NotFoundException("Originality job không tồn tại"));
        String truncated = truncate(errorMessage, 2000);
        job.setLastError(truncated);
        int maxAttempts = Math.max(1, properties.getMaxJobAttempts());
        // Client/validation errors will not succeed on retry — stop the burn loop.
        boolean permanent = truncated != null && (
            truncated.contains("400 Client Error")
                || truncated.contains("HTTP 400")
                || truncated.contains("422")
        );
        if (permanent || job.getAttempts() >= maxAttempts) {
            job.setJobState(OriginalityJobState.FAILED);
        } else {
            job.setJobState(OriginalityJobState.PENDING);
            job.setClaimedAt(null);
        }
        jobRepository.save(job);
    }

    @Transactional
    public void recoverStaleProcessing() {
        LocalDateTime cutoff = LocalDateTime.now().minusMinutes(
            Math.max(1, properties.getStaleProcessingMinutes())
        );
        for (OriginalityJobEntity job : jobRepository.findByJobStateAndClaimedAtBefore(
            OriginalityJobState.PROCESSING,
            cutoff
        )) {
            if (job.getAttempts() >= properties.getMaxJobAttempts()) {
                job.setJobState(OriginalityJobState.FAILED);
                job.setLastError("Originality job stale PROCESSING quá hạn.");
            } else {
                job.setJobState(OriginalityJobState.PENDING);
                job.setClaimedAt(null);
                job.setLastError("Requeued after stale PROCESSING.");
            }
            jobRepository.save(job);
        }
        // Never-claimed PENDING jobs — fail so Studio can unlock Đăng.
        LocalDateTime pendingCutoff = LocalDateTime.now().minusMinutes(
            Math.max(2, properties.getStaleProcessingMinutes())
        );
        for (OriginalityJobEntity job : jobRepository.findByJobStateAndCreatedAtBefore(
            OriginalityJobState.PENDING,
            pendingCutoff
        )) {
            if (job.getClaimedAt() != null) {
                continue;
            }
            job.setJobState(OriginalityJobState.FAILED);
            job.setLastError("Originality job PENDING quá hạn (worker không nhận).");
            jobRepository.save(job);
            log.warn("Failed stale PENDING originality jobId={} videoId={}", job.getId(),
                job.getVideo() == null ? null : job.getVideo().getId());
        }
    }

    private static String truncate(String raw, int max) {
        if (raw == null) {
            return null;
        }
        return raw.length() <= max ? raw : raw.substring(0, max);
    }
}
