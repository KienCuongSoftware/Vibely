package com.vibely.backend.originality;

import java.util.UUID;

public record OriginalityReportResponse(
    Long videoId,
    UUID videoPublicId,
    String jobState,
    String policyVersion,
    Double originalityScore,
    Double visualSimilarity,
    Double audioSimilarity,
    Double ocrSimilarity,
    Double watermarkScore,
    Double metadataScore,
    Double sceneObjectScore,
    Double overallConfidence,
    String riskLevel,
    String decision,
    UUID matchedVideoPublicId,
    String explainJson,
    String modelVersions,
    String lastError
) {
}
