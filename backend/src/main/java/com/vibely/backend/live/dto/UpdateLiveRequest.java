package com.vibely.backend.live.dto;

import jakarta.validation.constraints.Size;

/** Partial update; null fields are left unchanged. */
public record UpdateLiveRequest(
    @Size(max = 80, message = "Title must be at most 80 characters")
    String title,
    @Size(max = 300, message = "Description must be at most 300 characters")
    String description,
    String category,
    @Size(max = 512, message = "Cover URL is too long")
    String coverUrl,
    String visibility,
    Boolean allowComments,
    Boolean allowGifts,
    Boolean allowGuests,
    Boolean matureContent
) {}
