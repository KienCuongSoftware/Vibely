package com.vibely.backend.video;

import java.util.List;

public record SoundBrowsePageResponse(
    List<SoundBrowseItem> items,
    int page,
    int size,
    long total,
    boolean hasNext
) {
}
