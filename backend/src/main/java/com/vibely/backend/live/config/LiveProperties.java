package com.vibely.backend.live.config;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

@Component
@ConfigurationProperties(prefix = "live")
public class LiveProperties {

    private final Chat chat = new Chat();
    private final Like like = new Like();
    private final Realtime realtime = new Realtime();
    private final Discovery discovery = new Discovery();

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
}
