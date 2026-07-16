package com.vibely.backend.moderation;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "app.moderation")
public class ModerationProperties {

    private boolean enabled = true;
    /** Persist reports but do not mutate video status / explore when false. */
    private boolean applyDecisions = false;
    /**
     * When apply-decisions is true, AI BLOCK/DELETE on severe labels
     * (sexual_content, violence, spam, …) also bans the author.
     */
    private boolean autoBanOnBlock = true;
    private boolean rabbitmqEnabled = false;
    private String internalToken = "vibely-dev-moderation-token";
    private String policyVersion = "2026.07.1";
    private String engineVersion = "mod-policy-v1";
    private int maxJobAttempts = 5;
    private int staleProcessingMinutes = 30;
    /** Minutes after CU complete to evaluate without originality. */
    private int originalitySoftTimeoutMinutes = 2;
    /**
     * Max time a published video may stay HIDDEN waiting for AI clearance before
     * soft-promoting to READY (BLOCK/DELETE/REVIEW decisions still win if present).
     */
    private int publicationHoldTimeoutMinutes = 3;
    /** After this many minutes HIDDEN with CU done, force-enqueue moderation if missing. */
    private int publicationHoldEnqueueAfterMinutes = 1;
    private String exchange = "vibely.moderation";
    private String routingKeyEvaluate = "moderation.evaluate.requested";
    private String queueEvaluate = "moderation.evaluate";
    private long outboxPublishIntervalMs = 5000;
    private final Recovery recovery = new Recovery();

    public boolean isEnabled() {
        return enabled;
    }

    public void setEnabled(boolean enabled) {
        this.enabled = enabled;
    }

    public boolean isApplyDecisions() {
        return applyDecisions;
    }

    public void setApplyDecisions(boolean applyDecisions) {
        this.applyDecisions = applyDecisions;
    }

    public boolean isAutoBanOnBlock() {
        return autoBanOnBlock;
    }

    public void setAutoBanOnBlock(boolean autoBanOnBlock) {
        this.autoBanOnBlock = autoBanOnBlock;
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

    public String getPolicyVersion() {
        return policyVersion;
    }

    public void setPolicyVersion(String policyVersion) {
        this.policyVersion = policyVersion;
    }

    public String getEngineVersion() {
        return engineVersion;
    }

    public void setEngineVersion(String engineVersion) {
        this.engineVersion = engineVersion;
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

    public int getOriginalitySoftTimeoutMinutes() {
        return originalitySoftTimeoutMinutes;
    }

    public void setOriginalitySoftTimeoutMinutes(int originalitySoftTimeoutMinutes) {
        this.originalitySoftTimeoutMinutes = originalitySoftTimeoutMinutes;
    }

    public int getPublicationHoldTimeoutMinutes() {
        return publicationHoldTimeoutMinutes;
    }

    public void setPublicationHoldTimeoutMinutes(int publicationHoldTimeoutMinutes) {
        this.publicationHoldTimeoutMinutes = publicationHoldTimeoutMinutes;
    }

    public int getPublicationHoldEnqueueAfterMinutes() {
        return publicationHoldEnqueueAfterMinutes;
    }

    public void setPublicationHoldEnqueueAfterMinutes(int publicationHoldEnqueueAfterMinutes) {
        this.publicationHoldEnqueueAfterMinutes = publicationHoldEnqueueAfterMinutes;
    }

    public String getExchange() {
        return exchange;
    }

    public void setExchange(String exchange) {
        this.exchange = exchange;
    }

    public String getRoutingKeyEvaluate() {
        return routingKeyEvaluate;
    }

    public void setRoutingKeyEvaluate(String routingKeyEvaluate) {
        this.routingKeyEvaluate = routingKeyEvaluate;
    }

    public String getQueueEvaluate() {
        return queueEvaluate;
    }

    public void setQueueEvaluate(String queueEvaluate) {
        this.queueEvaluate = queueEvaluate;
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
