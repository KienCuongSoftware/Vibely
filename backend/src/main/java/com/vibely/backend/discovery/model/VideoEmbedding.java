package com.vibely.backend.discovery.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.MapsId;
import jakarta.persistence.OneToOne;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;
import java.time.LocalDateTime;

@Entity
@Table(name = "video_embeddings")
public class VideoEmbedding {
    @Id
    private Long videoId;

    @OneToOne(fetch = FetchType.LAZY, optional = false)
    @MapsId
    @JoinColumn(name = "video_id")
    private com.vibely.backend.video.Video video;

    @Column(nullable = false, length = 80)
    private String model;

    @Column(nullable = false)
    private int dimensions;

    @Column(name = "embedding_json", nullable = false, columnDefinition = "TEXT")
    private String embeddingJson;

    @Column(name = "source_text_hash", nullable = false, length = 64)
    private String sourceTextHash;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    @PrePersist
    void prePersist() {
        LocalDateTime now = LocalDateTime.now();
        if (createdAt == null) {
            createdAt = now;
        }
        if (updatedAt == null) {
            updatedAt = now;
        }
    }

    @PreUpdate
    void preUpdate() {
        updatedAt = LocalDateTime.now();
    }

    public Long getVideoId() {
        return videoId;
    }

    public void setVideo(com.vibely.backend.video.Video video) {
        this.video = video;
        this.videoId = video.getId();
    }

    public void setModel(String model) {
        this.model = model;
    }

    public void setDimensions(int dimensions) {
        this.dimensions = dimensions;
    }

    public void setEmbeddingJson(String embeddingJson) {
        this.embeddingJson = embeddingJson;
    }

    public void setSourceTextHash(String sourceTextHash) {
        this.sourceTextHash = sourceTextHash;
    }

    public String getSourceTextHash() {
        return sourceTextHash;
    }

    public String getEmbeddingJson() {
        return embeddingJson;
    }
}
