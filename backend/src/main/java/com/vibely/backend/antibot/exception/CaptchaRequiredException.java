package com.vibely.backend.antibot.exception;

import com.vibely.backend.antibot.domain.ChallengeLevel;

public class CaptchaRequiredException extends RuntimeException {

    private final ChallengeLevel challengeLevel;
    private final int riskScore;

    public CaptchaRequiredException(ChallengeLevel challengeLevel, int riskScore) {
        super("Captcha verification required");
        this.challengeLevel = challengeLevel;
        this.riskScore = riskScore;
    }

    public ChallengeLevel getChallengeLevel() {
        return challengeLevel;
    }

    public int getRiskScore() {
        return riskScore;
    }
}
