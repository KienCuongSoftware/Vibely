package com.vibely.backend.moderation;

import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

public class ModerationCompleteRequest {

    @NotNull
    @Min(0)
    @Max(100)
    private Integer risk;

    @NotNull
    @DecimalMin("0.0")
    @DecimalMax("1.0")
    private Double confidence;

    @NotBlank
    private String decision;

    private boolean overrideApplied;
    private boolean originalityPending;
    private Map<String, Object> explainJson = new HashMap<>();
    private String engineVersion;
    private List<EvidenceItem> evidence = new ArrayList<>();
    private List<PolicyResultItem> policyResults = new ArrayList<>();

    public Integer getRisk() {
        return risk;
    }

    public void setRisk(Integer risk) {
        this.risk = risk;
    }

    public Double getConfidence() {
        return confidence;
    }

    public void setConfidence(Double confidence) {
        this.confidence = confidence;
    }

    public String getDecision() {
        return decision;
    }

    public void setDecision(String decision) {
        this.decision = decision;
    }

    public boolean isOverrideApplied() {
        return overrideApplied;
    }

    public void setOverrideApplied(boolean overrideApplied) {
        this.overrideApplied = overrideApplied;
    }

    public boolean isOriginalityPending() {
        return originalityPending;
    }

    public void setOriginalityPending(boolean originalityPending) {
        this.originalityPending = originalityPending;
    }

    public Map<String, Object> getExplainJson() {
        return explainJson;
    }

    public void setExplainJson(Map<String, Object> explainJson) {
        this.explainJson = explainJson == null ? new HashMap<>() : explainJson;
    }

    public String getEngineVersion() {
        return engineVersion;
    }

    public void setEngineVersion(String engineVersion) {
        this.engineVersion = engineVersion;
    }

    public List<EvidenceItem> getEvidence() {
        return evidence;
    }

    public void setEvidence(List<EvidenceItem> evidence) {
        this.evidence = evidence == null ? new ArrayList<>() : evidence;
    }

    public List<PolicyResultItem> getPolicyResults() {
        return policyResults;
    }

    public void setPolicyResults(List<PolicyResultItem> policyResults) {
        this.policyResults = policyResults == null ? new ArrayList<>() : policyResults;
    }

    public static class EvidenceItem {
        private String sourceModality;
        private String reasonCode;
        private String snippet;
        private Integer frameIndex;
        private Integer timeMs;
        private Double weight = 1.0;
        private Map<String, Object> refJson = new HashMap<>();

        public String getSourceModality() {
            return sourceModality;
        }

        public void setSourceModality(String sourceModality) {
            this.sourceModality = sourceModality;
        }

        public String getReasonCode() {
            return reasonCode;
        }

        public void setReasonCode(String reasonCode) {
            this.reasonCode = reasonCode;
        }

        public String getSnippet() {
            return snippet;
        }

        public void setSnippet(String snippet) {
            this.snippet = snippet;
        }

        public Integer getFrameIndex() {
            return frameIndex;
        }

        public void setFrameIndex(Integer frameIndex) {
            this.frameIndex = frameIndex;
        }

        public Integer getTimeMs() {
            return timeMs;
        }

        public void setTimeMs(Integer timeMs) {
            this.timeMs = timeMs;
        }

        public Double getWeight() {
            return weight;
        }

        public void setWeight(Double weight) {
            this.weight = weight;
        }

        public Map<String, Object> getRefJson() {
            return refJson;
        }

        public void setRefJson(Map<String, Object> refJson) {
            this.refJson = refJson == null ? new HashMap<>() : refJson;
        }
    }

    public static class PolicyResultItem {
        private String label;
        private String outcome;
        private Double score = 0.0;
        private List<String> ruleCodes = new ArrayList<>();
        private Map<String, Object> detailJson = new HashMap<>();

        public String getLabel() {
            return label;
        }

        public void setLabel(String label) {
            this.label = label;
        }

        public String getOutcome() {
            return outcome;
        }

        public void setOutcome(String outcome) {
            this.outcome = outcome;
        }

        public Double getScore() {
            return score;
        }

        public void setScore(Double score) {
            this.score = score;
        }

        public List<String> getRuleCodes() {
            return ruleCodes;
        }

        public void setRuleCodes(List<String> ruleCodes) {
            this.ruleCodes = ruleCodes == null ? new ArrayList<>() : ruleCodes;
        }

        public Map<String, Object> getDetailJson() {
            return detailJson;
        }

        public void setDetailJson(Map<String, Object> detailJson) {
            this.detailJson = detailJson == null ? new HashMap<>() : detailJson;
        }
    }
}
