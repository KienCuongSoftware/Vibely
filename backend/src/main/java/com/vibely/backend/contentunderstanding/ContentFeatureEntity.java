package com.vibely.backend.contentunderstanding;

import com.vibely.backend.video.Video;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.MapsId;
import jakarta.persistence.OneToOne;
import jakarta.persistence.PostLoad;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;
import jakarta.persistence.Transient;
import java.time.LocalDateTime;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;
import org.springframework.data.domain.Persistable;

@Entity
@Table(name = "content_features")
public class ContentFeatureEntity implements Persistable<Long> {

    @Id
    @Column(name = "video_id")
    private Long videoId;

    @OneToOne(fetch = FetchType.LAZY, optional = false)
    @MapsId
    @JoinColumn(name = "video_id")
    private Video video;

    @Column(name = "content_sha256", length = 64)
    private String contentSha256;

    @Column(name = "feature_version", nullable = false, length = 64)
    private String featureVersion = "cu-phase1";

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "metadata", nullable = false, columnDefinition = "jsonb")
    private String metadata = "{}";

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "ocr", nullable = false, columnDefinition = "jsonb")
    private String ocr = "{}";

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "speech", nullable = false, columnDefinition = "jsonb")
    private String speech = "{}";

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "visual", nullable = false, columnDefinition = "jsonb")
    private String visual = "{}";

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "scene", nullable = false, columnDefinition = "jsonb")
    private String scene = "{}";

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "object_features", nullable = false, columnDefinition = "jsonb")
    private String objectFeatures = "{}";

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "emotion", nullable = false, columnDefinition = "jsonb")
    private String emotion = "{}";

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "audio", nullable = false, columnDefinition = "jsonb")
    private String audio = "{}";

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    /**
     * Assigned {@code @MapsId} means the id is non-null before insert — Spring Data would
     * treat that as an update (merge) and blow up with ObjectOptimisticLockingFailureException.
     */
    @Transient
    private boolean newEntity = true;

    @PostLoad
    void markNotNew() {
        newEntity = false;
    }

    @PrePersist
    @PreUpdate
    void touch() {
        updatedAt = LocalDateTime.now();
        if (metadata == null || metadata.isBlank()) {
            metadata = "{}";
        }
        if (ocr == null || ocr.isBlank()) {
            ocr = "{}";
        }
        if (speech == null || speech.isBlank()) {
            speech = "{}";
        }
        if (visual == null || visual.isBlank()) {
            visual = "{}";
        }
        if (scene == null || scene.isBlank()) {
            scene = "{}";
        }
        if (objectFeatures == null || objectFeatures.isBlank()) {
            objectFeatures = "{}";
        }
        if (emotion == null || emotion.isBlank()) {
            emotion = "{}";
        }
        if (audio == null || audio.isBlank()) {
            audio = "{}";
        }
    }

    @Override
    public Long getId() {
        return videoId;
    }

    @Override
    public boolean isNew() {
        return newEntity;
    }

    public Long getVideoId() {
        return videoId;
    }

    public void setVideo(Video video) {
        this.video = video;
        if (video != null) {
            this.videoId = video.getId();
        }
    }

    public void setContentSha256(String contentSha256) {
        this.contentSha256 = contentSha256;
    }

    public void setFeatureVersion(String featureVersion) {
        this.featureVersion = featureVersion;
    }

    public void setMetadata(String metadata) {
        this.metadata = metadata;
    }

    public void setOcr(String ocr) {
        this.ocr = ocr;
    }
}
