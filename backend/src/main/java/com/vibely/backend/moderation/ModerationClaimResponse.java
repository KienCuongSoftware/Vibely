package com.vibely.backend.moderation;

import java.util.List;
import java.util.Map;

public record ModerationClaimResponse(
    long jobId,
    long videoId,
    String videoPublicId,
    String policyVersion,
    boolean originalityPending,
    int attempts,
    Map<String, Object> snapshot,
    Map<String, Object> policy,
    List<Map<String, Object>> rules
) {
}
