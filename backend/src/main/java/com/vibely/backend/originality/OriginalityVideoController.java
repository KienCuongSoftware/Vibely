package com.vibely.backend.originality;

import com.vibely.backend.common.ApiResponse;
import java.util.UUID;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/videos")
public class OriginalityVideoController {

    private final OriginalityQueryService queryService;

    public OriginalityVideoController(OriginalityQueryService queryService) {
        this.queryService = queryService;
    }

    @GetMapping("/{publicId}/originality")
    public ApiResponse<OriginalityReportResponse> getOriginality(
        @PathVariable UUID publicId,
        Authentication authentication
    ) {
        return ApiResponse.success(queryService.getForAuthor(publicId, authentication.getName()));
    }
}
