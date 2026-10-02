package com.vibely.backend.live.config;

import java.util.ArrayList;
import java.util.List;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

@Component
@ConfigurationProperties(prefix = "live")
public class LiveProperties {

    private final Chat chat = new Chat();
    private final Like like = new Like();
    private final Realtime realtime = new Realtime();
    private final Discovery discovery = new Discovery();
    private final Media media = new Media();

    public Media getMedia() {
        return media;
    }

    public Chat getChat() {
        return chat;
    }

    public Like getLike() {
        return like;
    }

    public Realtime getRealtime() {
        return realtime;
    }

    public Discovery getDiscovery() {
        return discovery;
    }

    public static class RateLimit {
        private int maxMessages;
        private int windowSeconds;

        RateLimit(int maxMessages, int windowSeconds) {
            this.maxMessages = maxMessages;
            this.windowSeconds = windowSeconds;
        }

        public int getMaxMessages() {
            return maxMessages;
        }

        public void setMaxMessages(int maxMessages) {
            this.maxMessages = maxMessages;
        }

        public int getWindowSeconds() {
            return windowSeconds;
        }

        public void setWindowSeconds(int windowSeconds) {
            this.windowSeconds = windowSeconds;
        }
    }

    public static class Chat {
        /** Must stay within the live_comments.content column (500). */
        private int maxLength = 150;
        private int historyPageSize = 50;
        private final RateLimit rateLimit = new RateLimit(5, 10);

        public int getMaxLength() {
            return maxLength;
        }

        public void setMaxLength(int maxLength) {
            this.maxLength = maxLength;
        }

        public int getHistoryPageSize() {
            return historyPageSize;
        }

        public void setHistoryPageSize(int historyPageSize) {
            this.historyPageSize = historyPageSize;
        }

        public RateLimit getRateLimit() {
            return rateLimit;
        }
    }

    public static class Like {
        private int maxPerRequest = 100;
        private final LikeRateLimit rateLimit = new LikeRateLimit();

        public int getMaxPerRequest() {
            return maxPerRequest;
        }

        public void setMaxPerRequest(int maxPerRequest) {
            this.maxPerRequest = maxPerRequest;
        }

        public LikeRateLimit getRateLimit() {
            return rateLimit;
        }
    }

    public static class LikeRateLimit {
        private int maxLikes = 300;
        private int windowSeconds = 10;

        public int getMaxLikes() {
            return maxLikes;
        }

        public void setMaxLikes(int maxLikes) {
            this.maxLikes = maxLikes;
        }

        public int getWindowSeconds() {
            return windowSeconds;
        }

        public void setWindowSeconds(int windowSeconds) {
            this.windowSeconds = windowSeconds;
        }
    }

    public static class Realtime {
        private long broadcastIntervalMs = 1000;
        private long persistIntervalMs = 15000;
        private int stateTtlHours = 24;

        public long getBroadcastIntervalMs() {
            return broadcastIntervalMs;
        }

        public void setBroadcastIntervalMs(long broadcastIntervalMs) {
            this.broadcastIntervalMs = broadcastIntervalMs;
        }

        public long getPersistIntervalMs() {
            return persistIntervalMs;
        }

        public void setPersistIntervalMs(long persistIntervalMs) {
            this.persistIntervalMs = persistIntervalMs;
        }

        public int getStateTtlHours() {
            return stateTtlHours;
        }

        public void setStateTtlHours(int stateTtlHours) {
            this.stateTtlHours = stateTtlHours;
        }
    }

    public static class Discovery {
        private int defaultPageSize = 20;
        private int maxPageSize = 50;
        private int maxSearchLength = 80;

        public int getDefaultPageSize() {
            return defaultPageSize;
        }

        public void setDefaultPageSize(int defaultPageSize) {
            this.defaultPageSize = defaultPageSize;
        }

        public int getMaxPageSize() {
            return maxPageSize;
        }

        public void setMaxPageSize(int maxPageSize) {
            this.maxPageSize = maxPageSize;
        }

        public int getMaxSearchLength() {
            return maxSearchLength;
        }

        public void setMaxSearchLength(int maxSearchLength) {
            this.maxSearchLength = maxSearchLength;
        }
    }

    /**
     * SRS (WebRTC WHIP/WHEP) integration. Media never passes through this service; these settings
     * only describe where browsers send SDP offers and how SRS hooks are authenticated.
     */
    public static class Media {
        /** When false the LIVE module behaves as in phase 2 (no playback descriptor, no hooks). */
        private boolean enabled;
        /**
         * Public origin prefixed to WHIP/WHEP paths handed to browsers. Empty means same origin
         * (the reverse proxy forwards /rtc/v1/whip/ and /rtc/v1/whep/ to SRS).
         */
        private String publicUrl = "";
        /** SRS HTTP API base used server-side for stream listing and client kicks. */
        private String apiUrl = "";
        private String apiUsername = "";
        private String apiPassword = "";
        private String app = "live";
        /** Shared secret SRS sends back in the hook URL (hook_token query parameter). */
        private String hookToken = "";
        /** HMAC key for playback tokens; a random per-process key is used when empty. */
        private String tokenSecret = "";
        private int publishTokenTtlSeconds = 300;
        private int playbackTokenTtlSeconds = 120;
        /** How long an interrupted host may reconnect before the LIVE is ended automatically. */
        private int reconnectGraceSeconds = 60;
        /** How long a started LIVE may stay without any published stream before it is ended. */
        private int publishStartTimeoutSeconds = 180;
        private long healthCheckIntervalMs = 5000;
        private int apiConnectTimeoutMs = 2000;
        private int apiReadTimeoutMs = 3000;
        /** Ended sessions whose SRS cleanup failed are retried for this long, then given up. */
        private int cleanupRetryMinutes = 10;
        private List<String> stunUrls = new ArrayList<>();
        private List<String> turnUrls = new ArrayList<>();
        private String turnUsername = "";
        private String turnCredential = "";

        public boolean isEnabled() {
            return enabled;
        }

        public void setEnabled(boolean enabled) {
            this.enabled = enabled;
        }

        public String getPublicUrl() {
            return publicUrl;
        }

        public void setPublicUrl(String publicUrl) {
            this.publicUrl = publicUrl;
        }

        public String getApiUrl() {
            return apiUrl;
        }

        public void setApiUrl(String apiUrl) {
            this.apiUrl = apiUrl;
        }

        public String getApiUsername() {
            return apiUsername;
        }

        public void setApiUsername(String apiUsername) {
            this.apiUsername = apiUsername;
        }

        public String getApiPassword() {
            return apiPassword;
        }

        public void setApiPassword(String apiPassword) {
            this.apiPassword = apiPassword;
        }

        public String getApp() {
            return app;
        }

        public void setApp(String app) {
            this.app = app;
        }

        public String getHookToken() {
            return hookToken;
        }

        public void setHookToken(String hookToken) {
            this.hookToken = hookToken;
        }

        public String getTokenSecret() {
            return tokenSecret;
        }

        public void setTokenSecret(String tokenSecret) {
            this.tokenSecret = tokenSecret;
        }

        public int getPublishTokenTtlSeconds() {
            return publishTokenTtlSeconds;
        }

        public void setPublishTokenTtlSeconds(int publishTokenTtlSeconds) {
            this.publishTokenTtlSeconds = publishTokenTtlSeconds;
        }

        public int getPlaybackTokenTtlSeconds() {
            return playbackTokenTtlSeconds;
        }

        public void setPlaybackTokenTtlSeconds(int playbackTokenTtlSeconds) {
            this.playbackTokenTtlSeconds = playbackTokenTtlSeconds;
        }

        public int getReconnectGraceSeconds() {
            return reconnectGraceSeconds;
        }

        public void setReconnectGraceSeconds(int reconnectGraceSeconds) {
            this.reconnectGraceSeconds = reconnectGraceSeconds;
        }

        public int getPublishStartTimeoutSeconds() {
            return publishStartTimeoutSeconds;
        }

        public void setPublishStartTimeoutSeconds(int publishStartTimeoutSeconds) {
            this.publishStartTimeoutSeconds = publishStartTimeoutSeconds;
        }

        public long getHealthCheckIntervalMs() {
            return healthCheckIntervalMs;
        }

        public void setHealthCheckIntervalMs(long healthCheckIntervalMs) {
            this.healthCheckIntervalMs = healthCheckIntervalMs;
        }

        public int getApiConnectTimeoutMs() {
            return apiConnectTimeoutMs;
        }

        public void setApiConnectTimeoutMs(int apiConnectTimeoutMs) {
            this.apiConnectTimeoutMs = apiConnectTimeoutMs;
        }

        public int getApiReadTimeoutMs() {
            return apiReadTimeoutMs;
        }

        public void setApiReadTimeoutMs(int apiReadTimeoutMs) {
            this.apiReadTimeoutMs = apiReadTimeoutMs;
        }

        public int getCleanupRetryMinutes() {
            return cleanupRetryMinutes;
        }

        public void setCleanupRetryMinutes(int cleanupRetryMinutes) {
            this.cleanupRetryMinutes = cleanupRetryMinutes;
        }

        public List<String> getStunUrls() {
            return stunUrls;
        }

        public void setStunUrls(List<String> stunUrls) {
            this.stunUrls = stunUrls;
        }

        public List<String> getTurnUrls() {
            return turnUrls;
        }

        public void setTurnUrls(List<String> turnUrls) {
            this.turnUrls = turnUrls;
        }

        public String getTurnUsername() {
            return turnUsername;
        }

        public void setTurnUsername(String turnUsername) {
            this.turnUsername = turnUsername;
        }

        public String getTurnCredential() {
            return turnCredential;
        }

        public void setTurnCredential(String turnCredential) {
            this.turnCredential = turnCredential;
        }
    }
}
