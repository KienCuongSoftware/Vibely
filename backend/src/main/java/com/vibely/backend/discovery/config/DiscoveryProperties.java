package com.vibely.backend.discovery.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "app.discovery")
public class DiscoveryProperties {

    private boolean enabled = true;
    private boolean openAiEnabled = false;
    private String openAiApiKey = "";
    private String openAiBaseUrl = "https://api.openai.com/v1";
    private String understandingModel = "gpt-4o-mini";
    private String embeddingModel = "text-embedding-3-small";
    private int embeddingDimensions = 1536;
    private int understandingTimeoutSeconds = 45;
    private boolean asyncIndexing = true;
    private boolean hybridExplore = true;
    private boolean hybridRelated = true;
    private boolean hybridSearch = true;
    private double hashtagWeightCap = 0.25;
    private double embeddingSimilarityWeight = 0.70;
    private double topicSimilarityWeight = 0.30;
    private boolean mediaUnderstandingEnabled = true;
    private String whisperModel = "whisper-1";
    private String visionModel = "gpt-4o-mini";
    private int transcriptMaxSeconds = 60;
    private int ocrFrameCount = 3;
    private long mediaMaxBytes = 120L * 1024 * 1024;
    private RankingWeights ranking = new RankingWeights();
    private TopicFeedRankingWeights topicFeedRanking = new TopicFeedRankingWeights();
    private UserInterestWeights interest = new UserInterestWeights();

    public boolean isEnabled() {
        return enabled;
    }

    public void setEnabled(boolean enabled) {
        this.enabled = enabled;
    }

    public boolean isOpenAiEnabled() {
        return openAiEnabled;
    }

    public void setOpenAiEnabled(boolean openAiEnabled) {
        this.openAiEnabled = openAiEnabled;
    }

    public String getOpenAiApiKey() {
        return openAiApiKey;
    }

    public void setOpenAiApiKey(String openAiApiKey) {
        this.openAiApiKey = openAiApiKey;
    }

    public String getOpenAiBaseUrl() {
        return openAiBaseUrl;
    }

    public void setOpenAiBaseUrl(String openAiBaseUrl) {
        this.openAiBaseUrl = openAiBaseUrl;
    }

    public String getUnderstandingModel() {
        return understandingModel;
    }

    public void setUnderstandingModel(String understandingModel) {
        this.understandingModel = understandingModel;
    }

    public String getEmbeddingModel() {
        return embeddingModel;
    }

    public void setEmbeddingModel(String embeddingModel) {
        this.embeddingModel = embeddingModel;
    }

    public int getEmbeddingDimensions() {
        return embeddingDimensions;
    }

    public void setEmbeddingDimensions(int embeddingDimensions) {
        this.embeddingDimensions = embeddingDimensions;
    }

    public int getUnderstandingTimeoutSeconds() {
        return understandingTimeoutSeconds;
    }

    public void setUnderstandingTimeoutSeconds(int understandingTimeoutSeconds) {
        this.understandingTimeoutSeconds = understandingTimeoutSeconds;
    }

    public boolean isAsyncIndexing() {
        return asyncIndexing;
    }

    public void setAsyncIndexing(boolean asyncIndexing) {
        this.asyncIndexing = asyncIndexing;
    }

    public boolean isHybridExplore() {
        return hybridExplore;
    }

    public void setHybridExplore(boolean hybridExplore) {
        this.hybridExplore = hybridExplore;
    }

    public boolean isHybridRelated() {
        return hybridRelated;
    }

    public void setHybridRelated(boolean hybridRelated) {
        this.hybridRelated = hybridRelated;
    }

    public boolean isHybridSearch() {
        return hybridSearch;
    }

    public void setHybridSearch(boolean hybridSearch) {
        this.hybridSearch = hybridSearch;
    }

    public double getHashtagWeightCap() {
        return hashtagWeightCap;
    }

    public void setHashtagWeightCap(double hashtagWeightCap) {
        this.hashtagWeightCap = hashtagWeightCap;
    }

    public double getEmbeddingSimilarityWeight() {
        return embeddingSimilarityWeight;
    }

    public void setEmbeddingSimilarityWeight(double embeddingSimilarityWeight) {
        this.embeddingSimilarityWeight = embeddingSimilarityWeight;
    }

    public double getTopicSimilarityWeight() {
        return topicSimilarityWeight;
    }

    public void setTopicSimilarityWeight(double topicSimilarityWeight) {
        this.topicSimilarityWeight = topicSimilarityWeight;
    }

    public boolean isMediaUnderstandingEnabled() {
        return mediaUnderstandingEnabled;
    }

    public void setMediaUnderstandingEnabled(boolean mediaUnderstandingEnabled) {
        this.mediaUnderstandingEnabled = mediaUnderstandingEnabled;
    }

    public String getWhisperModel() {
        return whisperModel;
    }

    public void setWhisperModel(String whisperModel) {
        this.whisperModel = whisperModel;
    }

    public String getVisionModel() {
        return visionModel;
    }

    public void setVisionModel(String visionModel) {
        this.visionModel = visionModel;
    }

    public int getTranscriptMaxSeconds() {
        return transcriptMaxSeconds;
    }

    public void setTranscriptMaxSeconds(int transcriptMaxSeconds) {
        this.transcriptMaxSeconds = transcriptMaxSeconds;
    }

    public int getOcrFrameCount() {
        return ocrFrameCount;
    }

    public void setOcrFrameCount(int ocrFrameCount) {
        this.ocrFrameCount = ocrFrameCount;
    }

    public long getMediaMaxBytes() {
        return mediaMaxBytes;
    }

    public void setMediaMaxBytes(long mediaMaxBytes) {
        this.mediaMaxBytes = mediaMaxBytes;
    }

    public boolean isMediaUnderstandingReady() {
        return hasOpenAiCredentials() && mediaUnderstandingEnabled;
    }

    public RankingWeights getRanking() {
        return ranking;
    }

    public void setRanking(RankingWeights ranking) {
        this.ranking = ranking;
    }

    public TopicFeedRankingWeights getTopicFeedRanking() {
        return topicFeedRanking;
    }

    public void setTopicFeedRanking(TopicFeedRankingWeights topicFeedRanking) {
        this.topicFeedRanking = topicFeedRanking;
    }

    public UserInterestWeights getInterest() {
        return interest;
    }

    public void setInterest(UserInterestWeights interest) {
        this.interest = interest;
    }

    public boolean hasOpenAiCredentials() {
        return openAiEnabled && openAiApiKey != null && !openAiApiKey.isBlank();
    }

    public static class RankingWeights {
        private double watchTime = 0.20;
        private double completion = 0.35;
        private double share = 0.15;
        private double save = 0.10;
        private double comment = 0.10;
        private double follow = 0.05;
        private double freshness = 0.10;

        public double getWatchTime() {
            return watchTime;
        }

        public void setWatchTime(double watchTime) {
            this.watchTime = watchTime;
        }

        public double getCompletion() {
            return completion;
        }

        public void setCompletion(double completion) {
            this.completion = completion;
        }

        public double getShare() {
            return share;
        }

        public void setShare(double share) {
            this.share = share;
        }

        public double getSave() {
            return save;
        }

        public void setSave(double save) {
            this.save = save;
        }

        public double getComment() {
            return comment;
        }

        public void setComment(double comment) {
            this.comment = comment;
        }

        public double getFollow() {
            return follow;
        }

        public void setFollow(double follow) {
            this.follow = follow;
        }

        public double getFreshness() {
            return freshness;
        }

        public void setFreshness(double freshness) {
            this.freshness = freshness;
        }
    }

    public static class TopicFeedRankingWeights {
        private double topicRelevance = 0.35;
        private double engagement = 0.55;
        private double freshness = 0.10;

        public double getTopicRelevance() {
            return topicRelevance;
        }

        public void setTopicRelevance(double topicRelevance) {
            this.topicRelevance = topicRelevance;
        }

        public double getEngagement() {
            return engagement;
        }

        public void setEngagement(double engagement) {
            this.engagement = engagement;
        }

        public double getFreshness() {
            return freshness;
        }

        public void setFreshness(double freshness) {
            this.freshness = freshness;
        }
    }

    public static class UserInterestWeights {
        private double highCompletionBoost = 0.12;
        private double mediumCompletionBoost = 0.07;
        private double lowCompletionBoost = 0.03;
        private double skipPenalty = 0.05;
        private double likeBoost = 0.10;
        private double saveBoost = 0.12;
        private double commentBoost = 0.08;
        private double shareBoost = 0.14;
        private double followBoost = 0.05;

        public double getHighCompletionBoost() {
            return highCompletionBoost;
        }

        public void setHighCompletionBoost(double highCompletionBoost) {
            this.highCompletionBoost = highCompletionBoost;
        }

        public double getMediumCompletionBoost() {
            return mediumCompletionBoost;
        }

        public void setMediumCompletionBoost(double mediumCompletionBoost) {
            this.mediumCompletionBoost = mediumCompletionBoost;
        }

        public double getLowCompletionBoost() {
            return lowCompletionBoost;
        }

        public void setLowCompletionBoost(double lowCompletionBoost) {
            this.lowCompletionBoost = lowCompletionBoost;
        }

        public double getSkipPenalty() {
            return skipPenalty;
        }

        public void setSkipPenalty(double skipPenalty) {
            this.skipPenalty = skipPenalty;
        }

        public double getLikeBoost() {
            return likeBoost;
        }

        public void setLikeBoost(double likeBoost) {
            this.likeBoost = likeBoost;
        }

        public double getSaveBoost() {
            return saveBoost;
        }

        public void setSaveBoost(double saveBoost) {
            this.saveBoost = saveBoost;
        }

        public double getCommentBoost() {
            return commentBoost;
        }

        public void setCommentBoost(double commentBoost) {
            this.commentBoost = commentBoost;
        }

        public double getShareBoost() {
            return shareBoost;
        }

        public void setShareBoost(double shareBoost) {
            this.shareBoost = shareBoost;
        }

        public double getFollowBoost() {
            return followBoost;
        }

        public void setFollowBoost(double followBoost) {
            this.followBoost = followBoost;
        }
    }
}
