package com.vibely.backend.video;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.annotation.JsonProperty;
import java.time.Instant;

public class VideoUpdateRequest {

    @NotBlank(message = "Tiêu đề là bắt buộc")
    @Size(max = 120, message = "Tiêu đề tối đa 120 ký tự")
    private String title;

    @Size(max = 1000, message = "Mô tả tối đa 1000 ký tự")
    private String description;

    @Size(max = 2048, message = "URL ảnh bìa tối đa 2048 ký tự")
    private String thumbnailUrl;

    /** everyone | friends | onlyYou | PUBLIC | FRIENDS | PRIVATE */
    private String privacy;

    /**
     * When {@code true}, keep as Studio draft. When {@code false} or omitted, publish
     * ({@code studioDraft=false}) — matches existing Studio "Đăng" behavior.
     */
    private Boolean studioDraft;

    /**
     * Future publish instant. When the JSON field is present (including null), update schedule;
     * when omitted, leave the existing schedule unchanged.
     */
    private Instant scheduledAt;

    private boolean scheduledAtPresent;

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

    public String getThumbnailUrl() {
        return thumbnailUrl;
    }

    public void setThumbnailUrl(String thumbnailUrl) {
        this.thumbnailUrl = thumbnailUrl;
    }

    public String getPrivacy() {
        return privacy;
    }

    public void setPrivacy(String privacy) {
        this.privacy = privacy;
    }

    public Boolean getStudioDraft() {
        return studioDraft;
    }

    public void setStudioDraft(Boolean studioDraft) {
        this.studioDraft = studioDraft;
    }

    public Instant getScheduledAt() {
        return scheduledAt;
    }

    @JsonProperty("scheduledAt")
    public void setScheduledAt(Instant scheduledAt) {
        this.scheduledAt = scheduledAt;
        this.scheduledAtPresent = true;
    }

    @JsonIgnore
    public boolean isScheduledAtPresent() {
        return scheduledAtPresent;
    }
}
