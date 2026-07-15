package com.vibely.backend.contentunderstanding;

import com.vibely.backend.common.ApiResponse;
import java.util.List;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/videos")
public class VideoContentUnderstandingController {

    private final VideoContentUnderstandingQueryService queryService;

    public VideoContentUnderstandingController(VideoContentUnderstandingQueryService queryService) {
        this.queryService = queryService;
    }

    @GetMapping("/{publicId}/analysis")
    public ApiResponse<VideoAnalysisResponse> analysis(
        @PathVariable String publicId,
        Authentication authentication
    ) {
        return ApiResponse.success(queryService.getAnalysis(publicId, authentication));
    }

    @GetMapping("/{publicId}/semantic-tags")
    public ApiResponse<List<VideoSemanticTagResponse>> semanticTags(
        @PathVariable String publicId,
        Authentication authentication
    ) {
        return ApiResponse.success(queryService.getSemanticTags(publicId, authentication));
    }

    @GetMapping("/{publicId}/topics")
    public ApiResponse<List<VideoTopicSummaryResponse>> topics(
        @PathVariable String publicId,
        Authentication authentication
    ) {
        return ApiResponse.success(queryService.getTopics(publicId, authentication));
    }

    @GetMapping("/{publicId}/categories")
    public ApiResponse<List<VideoCategorySummaryResponse>> categories(
        @PathVariable String publicId,
        Authentication authentication
    ) {
        return ApiResponse.success(queryService.getCategories(publicId, authentication));
    }
}
