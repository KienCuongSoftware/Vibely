package com.vibely.backend.antibot.dto;

import jakarta.validation.constraints.NotBlank;
import java.util.List;

public record BehaviorTrackRequest(
    @NotBlank String sessionId,
    String deviceHash,
    List<BehaviorSamplePayload> samples
) {
}
