package com.vibely.backend.enhancement;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.vibely.backend.common.BadRequestException;
import com.vibely.backend.common.NotFoundException;
import com.vibely.backend.video.Video;
import com.vibely.backend.video.VideoRepository;
import com.vibely.backend.video.VideoStatus;
import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class EnhancementEnqueueService {

    private final EnhancementJobRepository jobRepository;
    private final EnhancementEventOutboxRepository outboxRepository;
    private final VideoRepository videoRepository;
    private final EnhancementProperties properties;
    private final ObjectMapper objectMapper;

    public EnhancementEnqueueService(
        EnhancementJobRepository jobRepository,
        EnhancementEventOutboxRepository outboxRepository,
        VideoRepository videoRepository,
        EnhancementProperties properties,
        ObjectMapper objectMapper
    ) {
        this.jobRepository = jobRepository;
        this.outboxRepository = outboxRepository;
        this.videoRepository = videoRepository;
        this.properties = properties;
        this.objectMapper = objectMapper;
    }

    @Transactional
    public UUID enqueueManual(Long videoId, String profile, String level, String triggerReason) {
        if (!properties.isEnabled()) {
            throw new BadRequestException("AI Enhancement đang tắt.");
        }
        Video video = videoRepository
            .findById(videoId)
            .orElseThrow(() -> new NotFoundException("Video không tồn tại"));
        if (video.getStatus() != VideoStatus.READY) {
            throw new BadRequestException("Chỉ enhance video đã READY.");
        }
        String targetProfile = (profile == null || profile.isBlank()) ? "ENHANCE_NATIVE" : profile.trim();
        String enhancementLevel =
            (level == null || level.isBlank()) ? properties.getDefaultLevel() : level.trim().toUpperCase();
        String reason = (triggerReason == null || triggerReason.isBlank()) ? "ADMIN" : triggerReason.trim();
        String idempotency = video.getId() + ":" + targetProfile + ":" + Instant.now().toEpochMilli();

        Optional<EnhancementJobEntity> existing = jobRepository
            .findByVideo_IdOrderByCreatedAtDesc(video.getId())
            .stream()
            .filter(j -> targetProfile.equals(j.getTargetProfile()))
            .filter(j -> j.getState() != EnhancementJobState.COMPLETED
                && j.getState() != EnhancementJobState.DEAD
                && j.getState() != EnhancementJobState.CANCELLED
                && j.getState() != EnhancementJobState.SKIPPED)
            .findFirst();
        if (existing.isPresent()) {
            return existing.get().getId();
        }

        EnhancementJobEntity job = new EnhancementJobEntity();
        job.setVideo(video);
        job.setTargetProfile(targetProfile);
        job.setEnhancementLevel(enhancementLevel);
        job.setTriggerReason(reason);
        job.setState(EnhancementJobState.PENDING);
        job.setAttempts(0);
        job.setMaxAttempts(properties.getMaxJobAttempts());
        job.setIdempotencyKey(idempotency);
        jobRepository.save(job);
        job.setStagingPrefix("tmp/enhance/" + job.getId() + "/");
        writeOutbox(job, video);
        job.setState(EnhancementJobState.QUEUED);
        job.setQueuedAt(Instant.now());
        jobRepository.save(job);
        return job.getId();
    }

    private void writeOutbox(EnhancementJobEntity job, Video video) {
        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("eventVersion", 1);
        payload.put("eventType", "enhance.job.requested.v1");
        payload.put("jobId", job.getId().toString());
        payload.put("videoId", video.getId());
        payload.put("videoPublicId", video.getPublicId() == null ? null : video.getPublicId().toString());
        payload.put("authorId", video.getAuthor() == null ? null : video.getAuthor().getId());
        payload.put("videoUrl", video.getVideoUrl());
        payload.put("targetProfile", job.getTargetProfile());
        payload.put("enhancementLevel", job.getEnhancementLevel());
        payload.put("engine", properties.getDefaultEngine());

        EnhancementEventOutboxEntity outbox = new EnhancementEventOutboxEntity();
        outbox.setAggregateType("enhancement_job");
        outbox.setAggregateId(job.getId().toString());
        outbox.setEventType("enhance.job.requested.v1");
        try {
            outbox.setPayload(objectMapper.writeValueAsString(payload));
        } catch (JsonProcessingException e) {
            outbox.setPayload("{\"jobId\":\"" + job.getId() + "\"}");
        }
        outboxRepository.save(outbox);
    }
}
