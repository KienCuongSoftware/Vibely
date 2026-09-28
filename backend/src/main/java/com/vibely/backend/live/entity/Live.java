package com.vibely.backend.live.entity;

import com.vibely.backend.common.UuidV7;
import com.vibely.backend.user.entity.User;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;
import jakarta.persistence.Version;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "lives")
public class Live {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "public_id", nullable = false, unique = true, updatable = false)
    private UUID publicId;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "host_id", nullable = false, updatable = false)
    private User host;

    @Column(nullable = false, length = 80)
    private String title;

    @Column(length = 300)
    private String description;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 32)
    private LiveCategory category;

    @Column(name = "cover_url", length = 512)
    private String coverUrl;

    // Status, timeline and counters change only through the conditional bulk updates in
    // LiveRepository so a stale entity save can never regress them.
    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 16, updatable = false)
    private LiveStatus status = LiveStatus.CREATED;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 16)
    private LiveVisibility visibility = LiveVisibility.PUBLIC;

    @Column(name = "allow_comments", nullable = false)
    private boolean allowComments = true;

    @Column(name = "allow_gifts", nullable = false)
    private boolean allowGifts = true;

    @Column(name = "allow_guests", nullable = false)
    private boolean allowGuests;

    @Column(name = "mature_content", nullable = false)
    private boolean matureContent;

    @Column(name = "viewer_count", nullable = false, updatable = false)
    private long viewerCount;

    @Column(name = "peak_viewer_count", nullable = false, updatable = false)
    private long peakViewerCount;

    @Column(name = "like_count", nullable = false, updatable = false)
    private long likeCount;

    @Column(name = "started_at", updatable = false)
    private LocalDateTime startedAt;

    @Column(name = "ended_at", updatable = false)
    private LocalDateTime endedAt;

    @Version
    @Column(nullable = false)
    private long version;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    @PrePersist
    void prePersist() {
        if (publicId == null) {
            publicId = UuidV7.generate();
        }
        LocalDateTime now = LocalDateTime.now();
        if (createdAt == null) {
            createdAt = now;
        }
        updatedAt = now;
    }

    @PreUpdate
    void preUpdate() {
        updatedAt = LocalDateTime.now();
    }

    public Long getId() {
        return id;
    }

    public UUID getPublicId() {
        return publicId;
    }

    public User getHost() {
        return host;
    }

    public void setHost(User host) {
        this.host = host;
    }

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

    public LiveCategory getCategory() {
        return category;
    }

    public void setCategory(LiveCategory category) {
        this.category = category;
    }

    public String getCoverUrl() {
        return coverUrl;
    }

    public void setCoverUrl(String coverUrl) {
        this.coverUrl = coverUrl;
    }

    public LiveStatus getStatus() {
        return status;
    }

    public LiveVisibility getVisibility() {
        return visibility;
    }

    public void setVisibility(LiveVisibility visibility) {
        this.visibility = visibility;
    }

    public boolean isAllowComments() {
        return allowComments;
    }

    public void setAllowComments(boolean allowComments) {
        this.allowComments = allowComments;
    }

    public boolean isAllowGifts() {
        return allowGifts;
    }

    public void setAllowGifts(boolean allowGifts) {
        this.allowGifts = allowGifts;
    }

    public boolean isAllowGuests() {
        return allowGuests;
    }

    public void setAllowGuests(boolean allowGuests) {
        this.allowGuests = allowGuests;
    }

    public boolean isMatureContent() {
        return matureContent;
    }

    public void setMatureContent(boolean matureContent) {
        this.matureContent = matureContent;
    }

    public long getViewerCount() {
        return viewerCount;
    }

    public long getPeakViewerCount() {
        return peakViewerCount;
    }

    public long getLikeCount() {
        return likeCount;
    }

    public LocalDateTime getStartedAt() {
        return startedAt;
    }

    public LocalDateTime getEndedAt() {
        return endedAt;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public LocalDateTime getUpdatedAt() {
        return updatedAt;
    }

    public boolean isHostedBy(User user) {
        return user != null && host != null && host.getId().equals(user.getId());
    }
}
