package com.vibely.backend.contentunderstanding;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

public class CuCompleteRequest {

    @Valid
    @NotNull
    private List<TagItem> semanticTags = new ArrayList<>();

    private Map<String, Object> metadataFeatures;
    private Map<String, Object> ocrFeatures;
    private Map<String, Object> metrics;
    private String featureVersion;
    private String contentSha256;

    public List<TagItem> getSemanticTags() {
        return semanticTags;
    }

    public void setSemanticTags(List<TagItem> semanticTags) {
        this.semanticTags = semanticTags;
    }

    public Map<String, Object> getMetadataFeatures() {
        return metadataFeatures;
    }

    public void setMetadataFeatures(Map<String, Object> metadataFeatures) {
        this.metadataFeatures = metadataFeatures;
    }

    public Map<String, Object> getOcrFeatures() {
        return ocrFeatures;
    }

    public void setOcrFeatures(Map<String, Object> ocrFeatures) {
        this.ocrFeatures = ocrFeatures;
    }

    public Map<String, Object> getMetrics() {
        return metrics;
    }

    public void setMetrics(Map<String, Object> metrics) {
        this.metrics = metrics;
    }

    public String getFeatureVersion() {
        return featureVersion;
    }

    public void setFeatureVersion(String featureVersion) {
        this.featureVersion = featureVersion;
    }

    public String getContentSha256() {
        return contentSha256;
    }

    public void setContentSha256(String contentSha256) {
        this.contentSha256 = contentSha256;
    }

    public static class TagItem {
        @NotNull
        private String slug;
        private Float confidence;
        private String source;
        private String modelVersion;
        private String reason;
        private Map<String, Object> evidence;

        public String getSlug() {
            return slug;
        }

        public void setSlug(String slug) {
            this.slug = slug;
        }

        public Float getConfidence() {
            return confidence;
        }

        public void setConfidence(Float confidence) {
            this.confidence = confidence;
        }

        public String getSource() {
            return source;
        }

        public void setSource(String source) {
            this.source = source;
        }

        public String getModelVersion() {
            return modelVersion;
        }

        public void setModelVersion(String modelVersion) {
            this.modelVersion = modelVersion;
        }

        public String getReason() {
            return reason;
        }

        public void setReason(String reason) {
            this.reason = reason;
        }

        public Map<String, Object> getEvidence() {
            return evidence;
        }

        public void setEvidence(Map<String, Object> evidence) {
            this.evidence = evidence;
        }
    }
}
