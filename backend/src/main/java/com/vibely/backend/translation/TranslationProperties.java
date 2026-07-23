package com.vibely.backend.translation;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "app.translation")
public class TranslationProperties {

    private boolean enabled = false;
    private String baseUrl = "http://127.0.0.1:8002";
    private String internalToken = "vibely-dev-translation-token";
    private long redisTtlSeconds = 604800;
    private long syncTimeoutMs = 12000;
    private long pollIntervalMs = 3000;
    private int maxJobAttempts = 5;
    private final Worker worker = new Worker();

    public boolean isEnabled() {
        return enabled;
    }

    public void setEnabled(boolean enabled) {
        this.enabled = enabled;
    }

    public String getBaseUrl() {
        return baseUrl;
    }

    public void setBaseUrl(String baseUrl) {
        this.baseUrl = baseUrl;
    }

    public String getInternalToken() {
        return internalToken;
    }

    public void setInternalToken(String internalToken) {
        this.internalToken = internalToken;
    }

    public long getRedisTtlSeconds() {
        return redisTtlSeconds;
    }

    public void setRedisTtlSeconds(long redisTtlSeconds) {
        this.redisTtlSeconds = redisTtlSeconds;
    }

    public long getSyncTimeoutMs() {
        return syncTimeoutMs;
    }

    public void setSyncTimeoutMs(long syncTimeoutMs) {
        this.syncTimeoutMs = syncTimeoutMs;
    }

    public long getPollIntervalMs() {
        return pollIntervalMs;
    }

    public void setPollIntervalMs(long pollIntervalMs) {
        this.pollIntervalMs = pollIntervalMs;
    }

    public int getMaxJobAttempts() {
        return maxJobAttempts;
    }

    public void setMaxJobAttempts(int maxJobAttempts) {
        this.maxJobAttempts = maxJobAttempts;
    }

    public Worker getWorker() {
        return worker;
    }

    public static class Worker {
        private boolean enabled = true;

        public boolean isEnabled() {
            return enabled;
        }

        public void setEnabled(boolean enabled) {
            this.enabled = enabled;
        }
    }
}
