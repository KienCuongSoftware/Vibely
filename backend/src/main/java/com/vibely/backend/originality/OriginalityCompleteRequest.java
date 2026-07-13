package com.vibely.backend.originality;

import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.util.ArrayList;
import java.util.List;

public class OriginalityCompleteRequest {

    @NotNull
    @DecimalMin("0.0")
    @DecimalMax("100.0")
    private Double originalityScore;

    @NotNull
    @DecimalMin("0.0")
    @DecimalMax("1.0")
    private Double visualSimilarity;

    @NotNull
    @DecimalMin("0.0")
    @DecimalMax("1.0")
    private Double audioSimilarity;

    @NotNull
    @DecimalMin("0.0")
    @DecimalMax("1.0")
    private Double ocrSimilarity;

    @NotNull
    @DecimalMin("0.0")
    @DecimalMax("1.0")
    private Double watermarkScore;

    @NotNull
    @DecimalMin("0.0")
    @DecimalMax("1.0")
    private Double metadataScore;

    @NotNull
    @DecimalMin("0.0")
    @DecimalMax("1.0")
    private Double sceneObjectScore;

    @NotNull
    @DecimalMin("0.0")
    @DecimalMax("1.0")
    private Double overallConfidence;

    @NotNull
    private OriginalityRiskLevel riskLevel;

    @NotNull
    private OriginalityDecision decision;

    private Long matchedVideoId;

    @NotBlank
    private String explainJson;

    @NotBlank
    private String modelVersions;

    private List<MatchItem> matches = new ArrayList<>();

    public Double getOriginalityScore() {
        return originalityScore;
    }

    public void setOriginalityScore(Double originalityScore) {
        this.originalityScore = originalityScore;
    }

    public Double getVisualSimilarity() {
        return visualSimilarity;
    }

    public void setVisualSimilarity(Double visualSimilarity) {
        this.visualSimilarity = visualSimilarity;
    }

    public Double getAudioSimilarity() {
        return audioSimilarity;
    }

    public void setAudioSimilarity(Double audioSimilarity) {
        this.audioSimilarity = audioSimilarity;
    }

    public Double getOcrSimilarity() {
        return ocrSimilarity;
    }

    public void setOcrSimilarity(Double ocrSimilarity) {
        this.ocrSimilarity = ocrSimilarity;
    }

    public Double getWatermarkScore() {
        return watermarkScore;
    }

    public void setWatermarkScore(Double watermarkScore) {
        this.watermarkScore = watermarkScore;
    }

    public Double getMetadataScore() {
        return metadataScore;
    }

    public void setMetadataScore(Double metadataScore) {
        this.metadataScore = metadataScore;
    }

    public Double getSceneObjectScore() {
        return sceneObjectScore;
    }

    public void setSceneObjectScore(Double sceneObjectScore) {
        this.sceneObjectScore = sceneObjectScore;
    }

    public Double getOverallConfidence() {
        return overallConfidence;
    }

    public void setOverallConfidence(Double overallConfidence) {
        this.overallConfidence = overallConfidence;
    }

    public OriginalityRiskLevel getRiskLevel() {
        return riskLevel;
    }

    public void setRiskLevel(OriginalityRiskLevel riskLevel) {
        this.riskLevel = riskLevel;
    }

    public OriginalityDecision getDecision() {
        return decision;
    }

    public void setDecision(OriginalityDecision decision) {
        this.decision = decision;
    }

    public Long getMatchedVideoId() {
        return matchedVideoId;
    }

    public void setMatchedVideoId(Long matchedVideoId) {
        this.matchedVideoId = matchedVideoId;
    }

    public String getExplainJson() {
        return explainJson;
    }

    public void setExplainJson(String explainJson) {
        this.explainJson = explainJson;
    }

    public String getModelVersions() {
        return modelVersions;
    }

    public void setModelVersions(String modelVersions) {
        this.modelVersions = modelVersions;
    }

    public List<MatchItem> getMatches() {
        return matches;
    }

    public void setMatches(List<MatchItem> matches) {
        this.matches = matches == null ? new ArrayList<>() : matches;
    }

    public static class MatchItem {
        @NotNull
        private Long matchedVideoId;
        @NotBlank
        private String modality;
        @NotNull
        @DecimalMin("0.0")
        @DecimalMax("1.0")
        private Double score;
        private String detailJson = "{}";

        public Long getMatchedVideoId() {
            return matchedVideoId;
        }

        public void setMatchedVideoId(Long matchedVideoId) {
            this.matchedVideoId = matchedVideoId;
        }

        public String getModality() {
            return modality;
        }

        public void setModality(String modality) {
            this.modality = modality;
        }

        public Double getScore() {
            return score;
        }

        public void setScore(Double score) {
            this.score = score;
        }

        public String getDetailJson() {
            return detailJson;
        }

        public void setDetailJson(String detailJson) {
            this.detailJson = detailJson;
        }
    }
}
