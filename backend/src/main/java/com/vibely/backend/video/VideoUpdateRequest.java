package com.vibely.backend.video;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.annotation.JsonProperty;
import com.fasterxml.jackson.annotation.JsonSetter;
import java.time.Instant;

public class VideoUpdateRequest {

    @NotBlank(message = "Title is required")
    @Size(max = 120, message = "Title must be at most 120 characters")
    private String title;

    @Size(max = 1000, message = "Description must be at most 1000 characters")
    private String description;

    @Size(max = 2048, message = "Cover image URL must be at most 2048 characters")
    private String thumbnailUrl;

    /** everyone | friends | onlyYou | PUBLIC | FRIENDS | PRIVATE */
    private String privacy;

    /**
     * When {@code true}, keep as Studio draft. When {@code false} or omitted, publish
     * ({@code studioDraft=false}) — matches existing Studio "Post" behavior.
     */
    private Boolean studioDraft;

    /**
     * Future publish instant. When the JSON field is present (including null), update schedule;
     * when omitted, leave the existing schedule unchanged.
     */
    private Instant scheduledAt;

    @JsonIgnore
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

    @JsonProperty("scheduledAt")
    public Instant getScheduledAt() {
        return scheduledAt;
    }

    /** {@link JsonSetter} forces mutator path so {@code scheduledAtPresent} is always set. */
    @JsonSetter("scheduledAt")
    public void setScheduledAt(Instant scheduledAt) {
        this.scheduledAt = scheduledAt;
        this.scheduledAtPresent = true;
    }

    @JsonIgnore
    public boolean isScheduledAtPresent() {
        return scheduledAtPresent;
    }
}
