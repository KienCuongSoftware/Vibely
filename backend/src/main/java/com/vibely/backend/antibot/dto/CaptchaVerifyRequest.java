package com.vibely.backend.antibot.dto;

import com.vibely.backend.antibot.domain.CaptchaPurpose;
import jakarta.validation.constraints.NotBlank;
import java.util.List;

public record CaptchaVerifyRequest(
    @NotBlank String challengeId,
    @NotBlank String signedToken,
    CaptchaPurpose purpose,
    Integer rotation,
    Integer sliderOffset,
    Boolean checkboxAttested,
    Long solveDurationMs,
    String sessionId,
    String deviceHash,
    List<BehaviorSamplePayload> behaviorSamples
) {
}
