package com.vibely.backend.antibot.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "app.antibot")
public class AntiBotProperties {

    private boolean enabled = true;
    private String hmacSecret = "vibely-antibot-dev-secret-change-in-production";
    private int captchaTtlSeconds = 120;
    private int verificationTokenTtlSeconds = 300;
    private int rotateToleranceDegrees = 8;
    private int minSolveTimeMs = 800;
    private int maxSolveTimeMs = 120_000;
    private String redisKeyPrefix = "ab:";
    private boolean kafkaEnabled = false;
    private int defaultTrustScore = 50;
    private boolean authProtectionEnabled = true;
    private boolean alwaysRequireCaptchaOnAuth = false;
    private int captchaBypassTrustThreshold = 80;
    private int maxFailedLoginsPerIpPerHour = 40;
    private int maxFailedLoginsPerEmailPerHour = 12;
    private int lowFailureThreshold = 2;
    private int mediumFailureThreshold = 4;
    private int highFailureThreshold = 7;
    private int extremeFailureThreshold = 12;
    private int sliderTolerancePx = 8;

    public boolean isEnabled() {
        return enabled;
    }

    public void setEnabled(boolean enabled) {
        this.enabled = enabled;
    }

    public String getHmacSecret() {
        return hmacSecret;
    }

    public void setHmacSecret(String hmacSecret) {
        this.hmacSecret = hmacSecret;
    }

    public int getCaptchaTtlSeconds() {
        return captchaTtlSeconds;
    }

    public void setCaptchaTtlSeconds(int captchaTtlSeconds) {
        this.captchaTtlSeconds = captchaTtlSeconds;
    }

    public int getVerificationTokenTtlSeconds() {
        return verificationTokenTtlSeconds;
    }

    public void setVerificationTokenTtlSeconds(int verificationTokenTtlSeconds) {
        this.verificationTokenTtlSeconds = verificationTokenTtlSeconds;
    }

    public int getRotateToleranceDegrees() {
        return rotateToleranceDegrees;
    }

    public void setRotateToleranceDegrees(int rotateToleranceDegrees) {
        this.rotateToleranceDegrees = rotateToleranceDegrees;
    }

    public int getMinSolveTimeMs() {
        return minSolveTimeMs;
    }

    public void setMinSolveTimeMs(int minSolveTimeMs) {
        this.minSolveTimeMs = minSolveTimeMs;
    }

    public int getMaxSolveTimeMs() {
        return maxSolveTimeMs;
    }

    public void setMaxSolveTimeMs(int maxSolveTimeMs) {
        this.maxSolveTimeMs = maxSolveTimeMs;
    }

    public String getRedisKeyPrefix() {
        return redisKeyPrefix;
    }

    public void setRedisKeyPrefix(String redisKeyPrefix) {
        this.redisKeyPrefix = redisKeyPrefix;
    }

    public boolean isKafkaEnabled() {
        return kafkaEnabled;
    }

    public void setKafkaEnabled(boolean kafkaEnabled) {
        this.kafkaEnabled = kafkaEnabled;
    }

    public int getDefaultTrustScore() {
        return defaultTrustScore;
    }

    public void setDefaultTrustScore(int defaultTrustScore) {
        this.defaultTrustScore = defaultTrustScore;
    }

    public String prefixed(String key) {
        return redisKeyPrefix + key;
    }

    public boolean isAuthProtectionEnabled() {
        return authProtectionEnabled;
    }

    public void setAuthProtectionEnabled(boolean authProtectionEnabled) {
        this.authProtectionEnabled = authProtectionEnabled;
    }

    public boolean isAlwaysRequireCaptchaOnAuth() {
        return alwaysRequireCaptchaOnAuth;
    }

    public void setAlwaysRequireCaptchaOnAuth(boolean alwaysRequireCaptchaOnAuth) {
        this.alwaysRequireCaptchaOnAuth = alwaysRequireCaptchaOnAuth;
    }

    public int getCaptchaBypassTrustThreshold() {
        return captchaBypassTrustThreshold;
    }

    public void setCaptchaBypassTrustThreshold(int captchaBypassTrustThreshold) {
        this.captchaBypassTrustThreshold = captchaBypassTrustThreshold;
    }

    public int getMaxFailedLoginsPerIpPerHour() {
        return maxFailedLoginsPerIpPerHour;
    }

    public void setMaxFailedLoginsPerIpPerHour(int maxFailedLoginsPerIpPerHour) {
        this.maxFailedLoginsPerIpPerHour = maxFailedLoginsPerIpPerHour;
    }

    public int getMaxFailedLoginsPerEmailPerHour() {
        return maxFailedLoginsPerEmailPerHour;
    }

    public void setMaxFailedLoginsPerEmailPerHour(int maxFailedLoginsPerEmailPerHour) {
        this.maxFailedLoginsPerEmailPerHour = maxFailedLoginsPerEmailPerHour;
    }

    public int getLowFailureThreshold() {
        return lowFailureThreshold;
    }

    public void setLowFailureThreshold(int lowFailureThreshold) {
        this.lowFailureThreshold = lowFailureThreshold;
    }

    public int getMediumFailureThreshold() {
        return mediumFailureThreshold;
    }

    public void setMediumFailureThreshold(int mediumFailureThreshold) {
        this.mediumFailureThreshold = mediumFailureThreshold;
    }

    public int getHighFailureThreshold() {
        return highFailureThreshold;
    }

    public void setHighFailureThreshold(int highFailureThreshold) {
        this.highFailureThreshold = highFailureThreshold;
    }

    public int getExtremeFailureThreshold() {
        return extremeFailureThreshold;
    }

    public void setExtremeFailureThreshold(int extremeFailureThreshold) {
        this.extremeFailureThreshold = extremeFailureThreshold;
    }

    public int getSliderTolerancePx() {
        return sliderTolerancePx;
    }

    public void setSliderTolerancePx(int sliderTolerancePx) {
        this.sliderTolerancePx = sliderTolerancePx;
    }
}
