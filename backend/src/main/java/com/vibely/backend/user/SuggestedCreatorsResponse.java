package com.vibely.backend.user;

import java.util.List;

public record SuggestedCreatorsResponse(
    long viewerFollowingCount,
    List<SuggestedCreatorDto> items,
    boolean hasNext,
    int page,
    int size
) {}
