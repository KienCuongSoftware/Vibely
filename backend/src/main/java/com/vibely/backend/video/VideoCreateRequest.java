package com.vibely.backend.video;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public class VideoCreateRequest {

    /** Matches Studio Upload / FFmpeg pipeline max duration (60 minutes). */
    public static final int MAX_DURATION_SECONDS = 60 * 60;

    @NotBlank(message = "Tiêu đề là bắt buộc")
    @Size(max = 120, message = "Tiêu đề tối đa 120 ký tự")
    private String title;

    @Size(max = 1000, message = "Mô tả tối đa 1000 ký tự")
    private String description;

    @NotBlank(message = "Đường dẫn video là bắt buộc")
    private String videoUrl;

    private String thumbnailUrl;
    private String audioUrl;
    @Size(max = 180, message = "Tên âm thanh tối đa 180 ký tự")
    private String audioTitle;

    @NotNull(message = "Thời lượng video là bắt buộc")
    @Min(value = 1, message = "Thời lượng video không hợp lệ")
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
}
