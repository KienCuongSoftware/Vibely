package com.vibely.backend.studio;

import java.util.List;

public record StudioInspirationRecommendedResponse(
    boolean locked,
    int minFollowers,
    long followerCount,
    List<StudioInspirationVideoResponse> items,
    List<StudioInspirationCreatorResponse> creators,
    int page,
    int size,
    long total,
    boolean hasNext
) {
}
