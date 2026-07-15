package com.vibely.backend.moderation;

import java.util.List;
import java.util.Map;

public record AdminModerationDetailResponse(
    long videoId,
    String videoPublicId,
    String title,
    String description,
    String videoUrl,
    String thumbnailUrl,
    String status,
    String authorUsername,
    Long authorId,
    Long queueId,
    String queueState,
    String claimedBy,
    Map<String, Object> report,
    List<Map<String, Object>> evidence,
    List<Map<String, Object>> policyResults,
    Map<String, Object> decision,
    Map<String, Object> originality,
    List<Map<String, Object>> semanticTags
) {
}
