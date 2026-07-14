package com.vibely.backend.contentunderstanding;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.vibely.backend.video.Video;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Optional;
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
        if (!properties.isEnabled() || video == null || video.getId() == null) {
            return;
        }
        if (video.isStudioDraft()) {
            return;
        }
        Optional<AnalysisJobEntity> latest = jobRepository.findFirstByVideo_IdOrderByCreatedAtDesc(video.getId());
        if (latest.isPresent()) {
            AnalysisJobEntity job = latest.get();
            if (job.getStatus() == AnalysisJobStatus.PENDING || job.getStatus() == AnalysisJobStatus.RUNNING) {
                return;
            }
            if (job.getStatus() == AnalysisJobStatus.COMPLETED
                || job.getStatus() == AnalysisJobStatus.FAILED_RETRYABLE
                || job.getStatus() == AnalysisJobStatus.FAILED_TERMINAL) {
                // Re-queue as a new job row for audit trail clarity.
            }
        }
        AnalysisJobEntity job = new AnalysisJobEntity();
        job.setVideo(video);
        job.setStatus(AnalysisJobStatus.PENDING);
        job.setTriggerReason(triggerReason == null || triggerReason.isBlank() ? "upload" : triggerReason);
        job.setModelBundleVersion(properties.getModelBundleVersion());
        job.setPriority(100);
        jobRepository.save(job);
        writeOutbox(job, video);
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
