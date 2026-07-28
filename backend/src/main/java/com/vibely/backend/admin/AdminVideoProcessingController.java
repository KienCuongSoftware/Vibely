package com.vibely.backend.admin;

import com.vibely.backend.common.ApiResponse;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/admin/video-processing")
@PreAuthorize("hasRole('ADMIN')")
public class AdminVideoProcessingController {

    private final AdminVideoProcessingService adminVideoProcessingService;

    public AdminVideoProcessingController(AdminVideoProcessingService adminVideoProcessingService) {
        this.adminVideoProcessingService = adminVideoProcessingService;
    }

    /** Re-encode one or more videos with the current HLS ladder (READY allowed). */
    @PostMapping("/reprocess")
    public ApiResponse<AdminVideoProcessingService.EnqueueResponse> reprocess(
        @RequestBody AdminVideoProcessingService.ReprocessRequest body
    ) {
        return ApiResponse.success(adminVideoProcessingService.reprocess(body));
    }

    /** Queue READY videos for HLS re-encode (newest first). */
    @PostMapping("/backfill-hls")
    public ApiResponse<AdminVideoProcessingService.EnqueueResponse> backfillHls(
        @RequestBody AdminVideoProcessingService.BackfillRequest body
    ) {
        return ApiResponse.success(adminVideoProcessingService.backfillReadyHls(body));
    }
}
