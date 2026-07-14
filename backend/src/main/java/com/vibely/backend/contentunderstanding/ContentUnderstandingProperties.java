package com.vibely.backend.contentunderstanding;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "app.content-understanding")
public class ContentUnderstandingProperties {

    private boolean enabled = true;
    private boolean rabbitmqEnabled = false;
    private String internalToken = "vibely-dev-cu-token";
    private String modelBundleVersion = "cu-bundle-phase1";
    private int maxJobAttempts = 5;
    private int staleRunningMinutes = 45;
    private String exchange = "content.topic";
    private String routingKeyAnalyze = "cu.analyze.requested";
    private String queueAnalyze = "cu.analyze";
    private long outboxPublishIntervalMs = 5000;
    private final Recovery recovery = new Recovery();

    public boolean isEnabled() {
        return enabled;
    }

    public void setEnabled(boolean enabled) {
        this.enabled = enabled;
    }

    public boolean isRabbitmqEnabled() {
        return rabbitmqEnabled;
    }

    public void setRabbitmqEnabled(boolean rabbitmqEnabled) {
        this.rabbitmqEnabled = rabbitmqEnabled;
    }

    public String getInternalToken() {
        return internalToken;
    }

    public void setInternalToken(String internalToken) {
        this.internalToken = internalToken;
    }

    public String getModelBundleVersion() {
        return modelBundleVersion;
    }

    public void setModelBundleVersion(String modelBundleVersion) {
        this.modelBundleVersion = modelBundleVersion;
    }

    public int getMaxJobAttempts() {
        return maxJobAttempts;
    }

    public void setMaxJobAttempts(int maxJobAttempts) {
        this.maxJobAttempts = maxJobAttempts;
    }

    public int getStaleRunningMinutes() {
        return staleRunningMinutes;
    }

    public void setStaleRunningMinutes(int staleRunningMinutes) {
        this.staleRunningMinutes = staleRunningMinutes;
    }

    public String getExchange() {
        return exchange;
    }

    public void setExchange(String exchange) {
        this.exchange = exchange;
    }

    public String getRoutingKeyAnalyze() {
        return routingKeyAnalyze;
    }

    public void setRoutingKeyAnalyze(String routingKeyAnalyze) {
        this.routingKeyAnalyze = routingKeyAnalyze;
    }

    public String getQueueAnalyze() {
        return queueAnalyze;
    }

    public void setQueueAnalyze(String queueAnalyze) {
        this.queueAnalyze = queueAnalyze;
    }

    public long getOutboxPublishIntervalMs() {
        return outboxPublishIntervalMs;
    }

    public void setOutboxPublishIntervalMs(long outboxPublishIntervalMs) {
        this.outboxPublishIntervalMs = outboxPublishIntervalMs;
    }

    public Recovery getRecovery() {
        return recovery;
    }

    public static class Recovery {
        private boolean enabled = true;
        private long intervalMs = 60000;

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
