package com.vibely.backend.studio;

import java.util.List;

public record StudioInspirationPageResponse(
    List<StudioInspirationVideoResponse> items,
    List<StudioInspirationCreatorResponse> creators,
    int page,
    int size,
    long total,
    boolean hasNext,
    long followerCount
) {
}
