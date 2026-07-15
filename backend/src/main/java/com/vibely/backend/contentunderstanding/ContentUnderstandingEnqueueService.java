package com.vibely.backend.contentunderstanding;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.vibely.backend.video.Video;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class ContentUnderstandingEnqueueService {

    private final AnalysisJobRepository jobRepository;
    private final CuEventOutboxRepository outboxRepository;
    private final ContentUnderstandingProperties properties;
    private final ObjectMapper objectMapper;

    public ContentUnderstandingEnqueueService(
        AnalysisJobRepository jobRepository,
        CuEventOutboxRepository outboxRepository,
        ContentUnderstandingProperties properties,
        ObjectMapper objectMapper
    ) {
        this.jobRepository = jobRepository;
        this.outboxRepository = outboxRepository;
        this.properties = properties;
        this.objectMapper = objectMapper;
    }

    @Transactional
    public void enqueueAfterVideoPersisted(Video video, String triggerReason) {
        enqueue(video, triggerReason, 100, false);
    }

    /**
     * @param force supersede existing PENDING/COMPLETED job so a fresh analyze can run; RUNNING is skipped
     * @return new job id, or empty if skipped
     */
    @Transactional
    public Optional<UUID> enqueue(Video video, String triggerReason, int priority, boolean force) {
        if (!properties.isEnabled() || video == null || video.getId() == null) {
            return Optional.empty();
        }
        if (video.isStudioDraft()) {
            return Optional.empty();
        }
        Optional<AnalysisJobEntity> latest = jobRepository.findFirstByVideo_IdOrderByCreatedAtDesc(video.getId());
        if (latest.isPresent()) {
            AnalysisJobEntity existing = latest.get();
            if (existing.getStatus() == AnalysisJobStatus.RUNNING) {
                return Optional.empty();
            }
            boolean pendingLike = existing.getStatus() == AnalysisJobStatus.PENDING
                || existing.getStatus() == AnalysisJobStatus.FAILED_RETRYABLE;
            if (pendingLike && !force) {
                return Optional.empty();
            }
            if (pendingLike || (force && existing.getStatus() == AnalysisJobStatus.COMPLETED)) {
                existing.setStatus(AnalysisJobStatus.FAILED_TERMINAL);
                existing.setErrorMessage("Superseded by admin/backfill requeue");
                existing.setFinishedAt(java.time.LocalDateTime.now());
                existing.setLockedAt(null);
                existing.setLockedBy(null);
                jobRepository.save(existing);
            }
        }
        AnalysisJobEntity job = new AnalysisJobEntity();
        job.setVideo(video);
        job.setStatus(AnalysisJobStatus.PENDING);
        job.setTriggerReason(triggerReason == null || triggerReason.isBlank() ? "upload" : triggerReason);
        job.setModelBundleVersion(properties.getModelBundleVersion());
        job.setPriority(Math.max(1, Math.min(priority, 1000)));
        jobRepository.save(job);
        writeOutbox(job, video);
        return Optional.of(job.getId());
    }

    private void writeOutbox(AnalysisJobEntity job, Video video) {
        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("eventVersion", 1);
        payload.put("eventType", "content.analyze.requested.v1");
        payload.put("jobId", job.getId().toString());
        payload.put("videoId", video.getId());
        payload.put("videoPublicId", video.getPublicId() == null ? null : video.getPublicId().toString());
        payload.put("triggerReason", job.getTriggerReason());
        payload.put("modelBundleVersion", job.getModelBundleVersion());
        CuEventOutboxEntity outbox = new CuEventOutboxEntity();
        outbox.setAggregateType("analysis_job");
        outbox.setAggregateId(job.getId().toString());
        outbox.setEventType("content.analyze.requested.v1");
        try {
            outbox.setPayload(objectMapper.writeValueAsString(payload));
        } catch (JsonProcessingException e) {
            outbox.setPayload("{\"jobId\":\"" + job.getId() + "\"}");
        }
        outboxRepository.save(outbox);
    }
}
