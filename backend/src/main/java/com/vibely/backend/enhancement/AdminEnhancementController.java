package com.vibely.backend.enhancement;

import com.vibely.backend.common.ApiResponse;
import jakarta.validation.constraints.NotNull;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/admin/enhancement")
@PreAuthorize("hasRole('ADMIN')")
public class AdminEnhancementController {

    private final EnhancementEnqueueService enqueueService;
    private final EnhancementJobService jobService;

    public AdminEnhancementController(
        EnhancementEnqueueService enqueueService,
        EnhancementJobService jobService
    ) {
        this.enqueueService = enqueueService;
        this.jobService = jobService;
    }

    @PostMapping("/enqueue")
    public ApiResponse<Map<String, Object>> enqueue(@RequestBody EnqueueBody body) {
        UUID jobId = enqueueService.enqueueManual(
            body.videoId(),
            body.profile(),
            body.level(),
            body.triggerReason() == null ? "ADMIN" : body.triggerReason()
        );
        return ApiResponse.success(Map.of("jobId", jobId.toString()));
    }

    @GetMapping("/jobs/{jobId}")
    public ApiResponse<Map<String, Object>> job(@PathVariable UUID jobId) {
        EnhancementJobEntity job = jobService.requireJob(jobId);
        Map<String, Object> row = new LinkedHashMap<>();
        row.put("jobId", job.getId().toString());
        row.put("videoId", job.getVideo() == null ? null : job.getVideo().getId());
        row.put("state", job.getState().name());
        row.put("progressPct", job.getProgressPct());
        row.put("progressStage", job.getProgressStage());
        row.put("progressDetail", job.getProgressDetail());
        row.put("targetProfile", job.getTargetProfile());
        row.put("level", job.getEnhancementLevel());
        row.put("attempts", job.getAttempts());
        row.put("lastError", job.getLastError());
        row.put("outputVersionId", job.getOutputVersionId());
        return ApiResponse.success(row);
    }

    @GetMapping("/videos/{videoId}/versions")
    public ApiResponse<List<Map<String, Object>>> versions(@PathVariable Long videoId) {
        List<Map<String, Object>> rows = jobService.listActiveVersions(videoId).stream().map(v -> {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("id", v.getId());
            m.put("kind", v.getKind().name());
            m.put("profile", v.getProfile());
            m.put("label", v.getLabel());
            m.put("masterPlaylistUrl", v.getMasterPlaylistUrl());
            m.put("widthPx", v.getWidthPx());
            m.put("heightPx", v.getHeightPx());
            return m;
        }).toList();
        return ApiResponse.success(rows);
    }

    public record EnqueueBody(
        @NotNull Long videoId,
        String profile,
        String level,
        String triggerReason
    ) {}
}
