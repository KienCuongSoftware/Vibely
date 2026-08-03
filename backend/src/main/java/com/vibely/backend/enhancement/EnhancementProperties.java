package com.vibely.backend.enhancement;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

@Component
@ConfigurationProperties(prefix = "app.enhancement")
public class EnhancementProperties {

    private boolean enabled = true;
    private boolean rabbitmqEnabled = false;
    private String internalToken = "vibely-dev-enhance-token";
    private int maxJobAttempts = 5;
    private int leaseMinutes = 30;
    private String exchange = "enhance.topic";
    private String routingKey = "enhance.job.requested";
    private String queue = "ai.enhance.work";
    private long outboxPublishIntervalMs = 5000;
    private String defaultEngine = "noop";
    private String defaultLevel = "MEDIUM";
    /** When true, enqueue ENHANCE_NATIVE as soon as standard HLS is READY. */
    private boolean enqueueOnReady = false;
    /** Prefer AI playlist in feed/API when an ACTIVE AI version exists. */
    private boolean preferAiPlayback = true;
    /** Scheduled rule scan interval. */
    private long ruleEvalIntervalMs = 120_000;
    private long leaseRecoveryIntervalMs = 60_000;
    private boolean ruleEvalEnabled = true;
    private boolean leaseRecoveryEnabled = true;

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

    public int getMaxJobAttempts() {
        return maxJobAttempts;
    }

    public void setMaxJobAttempts(int maxJobAttempts) {
        this.maxJobAttempts = maxJobAttempts;
    }

    public int getLeaseMinutes() {
        return leaseMinutes;
    }

    public void setLeaseMinutes(int leaseMinutes) {
        this.leaseMinutes = leaseMinutes;
    }

    public String getExchange() {
        return exchange;
    }

    public void setExchange(String exchange) {
        this.exchange = exchange;
    }

    public String getRoutingKey() {
        return routingKey;
    }

    public void setRoutingKey(String routingKey) {
        this.routingKey = routingKey;
    }

    public String getQueue() {
        return queue;
    }

    public void setQueue(String queue) {
        this.queue = queue;
    }

    public long getOutboxPublishIntervalMs() {
        return outboxPublishIntervalMs;
    }

    public void setOutboxPublishIntervalMs(long outboxPublishIntervalMs) {
        this.outboxPublishIntervalMs = outboxPublishIntervalMs;
    }

    public String getDefaultEngine() {
        return defaultEngine;
    }

    public void setDefaultEngine(String defaultEngine) {
        this.defaultEngine = defaultEngine;
    }

    public String getDefaultLevel() {
        return defaultLevel;
    }

    public void setDefaultLevel(String defaultLevel) {
        this.defaultLevel = defaultLevel;
    }

    public boolean isEnqueueOnReady() {
        return enqueueOnReady;
    }

    public void setEnqueueOnReady(boolean enqueueOnReady) {
        this.enqueueOnReady = enqueueOnReady;
    }

    public boolean isPreferAiPlayback() {
        return preferAiPlayback;
    }

    public void setPreferAiPlayback(boolean preferAiPlayback) {
        this.preferAiPlayback = preferAiPlayback;
    }

    public long getRuleEvalIntervalMs() {
        return ruleEvalIntervalMs;
    }

    public void setRuleEvalIntervalMs(long ruleEvalIntervalMs) {
        this.ruleEvalIntervalMs = ruleEvalIntervalMs;
    }

    public long getLeaseRecoveryIntervalMs() {
        return leaseRecoveryIntervalMs;
    }

    public void setLeaseRecoveryIntervalMs(long leaseRecoveryIntervalMs) {
        this.leaseRecoveryIntervalMs = leaseRecoveryIntervalMs;
    }

    public boolean isRuleEvalEnabled() {
        return ruleEvalEnabled;
    }

    public void setRuleEvalEnabled(boolean ruleEvalEnabled) {
        this.ruleEvalEnabled = ruleEvalEnabled;
    }

    public boolean isLeaseRecoveryEnabled() {
        return leaseRecoveryEnabled;
    }

    public void setLeaseRecoveryEnabled(boolean leaseRecoveryEnabled) {
        this.leaseRecoveryEnabled = leaseRecoveryEnabled;
    }
}
