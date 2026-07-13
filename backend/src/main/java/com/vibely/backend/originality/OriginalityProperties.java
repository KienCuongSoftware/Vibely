package com.vibely.backend.originality;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "app.originality")
public class OriginalityProperties {

    /** Master switch: enqueue jobs on video create. */
    private boolean enabled = true;

    /** Shared secret for /api/internal/originality/** (Python worker). */
    private String internalToken = "vibely-dev-originality-token";

    /** Written onto every new job. */
    private String policyVersion = "v1";

    private int maxJobAttempts = 5;

    /** Re-queue PROCESSING jobs older than this many minutes. */
    private int staleProcessingMinutes = 45;

    private Recovery recovery = new Recovery();

    public boolean isEnabled() {
        return enabled;
    }

    public void setEnabled(boolean enabled) {
        this.enabled = enabled;
    }

    public String getInternalToken() {
        return internalToken;
    }

    public void setInternalToken(String internalToken) {
        this.internalToken = internalToken;
    }

    public String getPolicyVersion() {
        return policyVersion;
    }

    public void setPolicyVersion(String policyVersion) {
        this.policyVersion = policyVersion;
    }

    public int getMaxJobAttempts() {
        return maxJobAttempts;
    }

    public void setMaxJobAttempts(int maxJobAttempts) {
        this.maxJobAttempts = maxJobAttempts;
    }

    public int getStaleProcessingMinutes() {
        return staleProcessingMinutes;
    }

    public void setStaleProcessingMinutes(int staleProcessingMinutes) {
        this.staleProcessingMinutes = staleProcessingMinutes;
    }

    public Recovery getRecovery() {
        return recovery;
    }

    public void setRecovery(Recovery recovery) {
        this.recovery = recovery;
    }

    public static class Recovery {
        private boolean enabled = true;
        private long intervalMs = 60_000L;

        public boolean isEnabled() {
            return enabled;
        }

        public void setEnabled(boolean enabled) {
            this.enabled = enabled;
        }

        public long getIntervalMs() {
            return intervalMs;
        }

        public void setIntervalMs(long intervalMs) {
            this.intervalMs = intervalMs;
        }
    }
}
