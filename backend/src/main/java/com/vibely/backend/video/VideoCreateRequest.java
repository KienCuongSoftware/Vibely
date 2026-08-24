package com.vibely.backend.video;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.time.Instant;
import java.util.List;

public class VideoCreateRequest {

    /** Matches Studio Upload / FFmpeg pipeline max duration (60 minutes). */
    public static final int MAX_DURATION_SECONDS = 60 * 60;

    /** Minimum lead time for scheduled publish (TikTok-style). */
    public static final int MIN_SCHEDULE_LEAD_MINUTES = 15;

    @NotBlank(message = "Title is required")
    @Size(max = 120, message = "Title must be at most 120 characters")
    private String title;

    @Size(max = 1000, message = "Description must be at most 1000 characters")
    private String description;

    @NotBlank(message = "Video path is required")
    private String videoUrl;

    private String thumbnailUrl;
    private String audioUrl;
    @Size(max = 180, message = "Sound name must be at most 180 characters")
    private String audioTitle;

    @NotNull(message = "Video duration is required")
    @Min(value = 1, message = "Invalid video duration")
    private Integer durationSeconds;

    /**
     * When true (or omitted), video is a Studio draft until Đăng.
     * Send false only when intentionally publishing in the same create call.
     */
    private Boolean studioDraft;

    /**
     * everyone | friends | onlyYou | PUBLIC | FRIENDS | PRIVATE
     */
    private String privacy;

    /** Future publish instant (ISO-8601). Null = not scheduled. */
    private Instant scheduledAt;

    /** VIDEO (default) or PHOTO slideshow. */
    private String mediaKind;

    /** Public thumbnail URLs for PHOTO posts (1–35). */
    private List<String> photoUrls;

    public String getTitle() {
        return title;
    }

    public void setTitle(String title) {
        this.title = title;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public String getVideoUrl() {
        return videoUrl;
    }

    public void setVideoUrl(String videoUrl) {
        this.videoUrl = videoUrl;
    }

    public String getThumbnailUrl() {
        return thumbnailUrl;
    }

    public void setThumbnailUrl(String thumbnailUrl) {
        this.thumbnailUrl = thumbnailUrl;
    }

    public String getAudioUrl() {
        return audioUrl;
    }

    public void setAudioUrl(String audioUrl) {
        this.audioUrl = audioUrl;
    }

    public String getAudioTitle() {
        return audioTitle;
    }

    public void setAudioTitle(String audioTitle) {
        this.audioTitle = audioTitle;
    }

    public Integer getDurationSeconds() {
        return durationSeconds;
    }

    public void setDurationSeconds(Integer durationSeconds) {
        this.durationSeconds = durationSeconds;
    }

    public Boolean getStudioDraft() {
        return studioDraft;
    }

    public void setStudioDraft(Boolean studioDraft) {
        this.studioDraft = studioDraft;
    }

    public String getPrivacy() {
        return privacy;
    }

    public void setPrivacy(String privacy) {
        this.privacy = privacy;
    }

    public Instant getScheduledAt() {
        return scheduledAt;
    }

    public void setScheduledAt(Instant scheduledAt) {
        this.scheduledAt = scheduledAt;
    }

    public String getMediaKind() {
        return mediaKind;
    }

    public void setMediaKind(String mediaKind) {
        this.mediaKind = mediaKind;
    }

    public List<String> getPhotoUrls() {
        return photoUrls;
    }

    public void setPhotoUrls(List<String> photoUrls) {
        this.photoUrls = photoUrls;
    }
}
