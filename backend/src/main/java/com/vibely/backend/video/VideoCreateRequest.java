package com.vibely.backend.video;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public class VideoCreateRequest {

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
}
