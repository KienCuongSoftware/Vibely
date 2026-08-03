package com.vibely.backend.enhancement;

import jakarta.validation.constraints.NotBlank;

public record EnhanceCompleteRequest(
    @NotBlank String masterPlaylistUrl,
    String storagePrefix,
    Integer widthPx,
    Integer heightPx,
    String label,
    String modelName,
    String modelVersion
) {}
