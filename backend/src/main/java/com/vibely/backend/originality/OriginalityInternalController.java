package com.vibely.backend.originality;

import com.vibely.backend.common.ApiResponse;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import java.util.Map;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api/internal/originality")
public class OriginalityInternalController {

    private final OriginalityJobService jobService;
    private final OriginalityProperties properties;

    public OriginalityInternalController(
        OriginalityJobService jobService,
        OriginalityProperties properties
    ) {
        this.jobService = jobService;
        this.properties = properties;
    }

    @PostMapping("/claim")
    public ResponseEntity<ApiResponse<OriginalityClaimResponse>> claim(
        @RequestHeader(value = "X-Internal-Token", required = false) String token
    ) {
        requireInternalToken(token);
        return jobService
            .claimNext()
            .map(claim -> ResponseEntity.ok(ApiResponse.success(claim)))
            .orElseGet(() -> ResponseEntity.noContent().build());
    }

    @PostMapping("/{jobId}/complete")
    public ApiResponse<Map<String, Object>> complete(
        @RequestHeader(value = "X-Internal-Token", required = false) String token,
        @PathVariable long jobId,
        @Valid @RequestBody OriginalityCompleteRequest body
    ) {
        requireInternalToken(token);
        jobService.complete(jobId, body);
        return ApiResponse.success(Map.of("jobId", jobId, "status", "COMPLETED"));
    }

    @PostMapping("/{jobId}/fail")
    public ApiResponse<Map<String, Object>> fail(
        @RequestHeader(value = "X-Internal-Token", required = false) String token,
        @PathVariable long jobId,
        @Valid @RequestBody FailBody body
    ) {
        requireInternalToken(token);
        jobService.fail(jobId, body.errorMessage());
        return ApiResponse.success(Map.of("jobId", jobId, "status", "FAILED_OR_REQUEUED"));
    }

    private void requireInternalToken(String token) {
        String expected = properties.getInternalToken();
        if (expected == null || expected.isBlank()) {
            throw new ResponseStatusException(
                HttpStatus.SERVICE_UNAVAILABLE,
                "Originality internal token chưa được cấu hình."
            );
        }
        if (token == null || !expected.equals(token)) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Internal token không hợp lệ.");
        }
    }

    public record FailBody(@NotBlank String errorMessage) {
    }
}
