package com.vibely.backend.storage;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "app.s3")
public class S3Properties {

    private boolean enabled;
    private String bucket = "";
    private String region = "ap-southeast-2";
    private int presignExpirationMinutes = 15;
    /**
     * When positive, API may replace stored S3/CloudFront media URLs with presigned GET URLs for private buckets.
     * Env: {@code APP_S3_PLAYBACK_PRESIGN_EXPIRY_HOURS}. Production with public CloudFront usually uses 0.
     */
    private int playbackPresignExpiryHours = 0;
    /** Base URL for playback (optional CloudFront). No trailing slash. */
    private String publicUrlBase = "";
    /** Optional local overrides; prefer IAM/instance credentials in production. */
    private String accessKeyId = "";
    private String secretAccessKey = "";

    public boolean isEnabled() {
        return enabled;
    }

    public void setEnabled(boolean enabled) {
        this.enabled = enabled;
    }

    public String getBucket() {
        return bucket;
    }

    public void setBucket(String bucket) {
        this.bucket = bucket;
    }

    public String getRegion() {
        return region;
    }

    public void setRegion(String region) {
        this.region = region;
    }

    public int getPresignExpirationMinutes() {
        return presignExpirationMinutes;
    }

    public void setPresignExpirationMinutes(int presignExpirationMinutes) {
        this.presignExpirationMinutes = presignExpirationMinutes;
    }

    public int getPlaybackPresignExpiryHours() {
        return playbackPresignExpiryHours;
    }

    public void setPlaybackPresignExpiryHours(int playbackPresignExpiryHours) {
        this.playbackPresignExpiryHours = playbackPresignExpiryHours;
    }

    public String getPublicUrlBase() {
        return publicUrlBase;
    }

    public void setPublicUrlBase(String publicUrlBase) {
        this.publicUrlBase = publicUrlBase;
    }

    public String getAccessKeyId() {
        return accessKeyId;
    }

    public void setAccessKeyId(String accessKeyId) {
        this.accessKeyId = accessKeyId;
    }

    public String getSecretAccessKey() {
        return secretAccessKey;
    }

    public void setSecretAccessKey(String secretAccessKey) {
        this.secretAccessKey = secretAccessKey;
    }
}
