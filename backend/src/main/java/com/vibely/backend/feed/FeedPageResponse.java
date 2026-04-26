package com.vibely.backend.feed;

import com.vibely.backend.video.VideoResponse;
import java.util.List;

public record FeedPageResponse(
    List<VideoResponse> items,
    int page,
    int size,
    long total,
    boolean hasNext,
    String sort
) {
}
