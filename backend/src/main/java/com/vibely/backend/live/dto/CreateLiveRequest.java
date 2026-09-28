package com.vibely.backend.live.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/** The host is always the authenticated user; any host id sent by the client is ignored. */
public record CreateLiveRequest(
    @NotBlank(message = "Title is required")
    @Size(max = 80, message = "Title must be at most 80 characters")
    String title,
    @Size(max = 300, message = "Description must be at most 300 characters")
    String description,
    @NotBlank(message = "Category is required")
    String category,
    @Size(max = 512, message = "Cover URL is too long")
    String coverUrl,
    String visibility,
    Boolean allowComments,
    Boolean allowGifts,
    Boolean allowGuests,
    Boolean matureContent
) {}
