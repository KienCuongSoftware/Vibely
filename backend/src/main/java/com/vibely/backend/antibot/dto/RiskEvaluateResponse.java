package com.vibely.backend.antibot.dto;

import com.vibely.backend.antibot.domain.ChallengeLevel;
import com.vibely.backend.antibot.domain.RiskLevel;
import java.util.List;

public record RiskEvaluateResponse(
    int riskScore,
    RiskLevel riskLevel,
    ChallengeLevel challengeLevel,
    boolean challengeRequired,
    String challengeToken,
    int sessionTrustScore,
    int deviceTrustScore,
    int ipReputationScore,
    List<String> signals
) {
}
