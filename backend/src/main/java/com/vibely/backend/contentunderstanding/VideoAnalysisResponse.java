package com.vibely.backend.contentunderstanding;

import java.util.List;
import java.util.Map;

public record VideoAnalysisResponse(
    String videoPublicId,
    Long videoId,
    String jobStatus,
    String featureVersion,
    String modelBundleVersion,
    List<VideoSemanticTagResponse> topTags,
    Map<String, Object> modalityNotes
) {
}
