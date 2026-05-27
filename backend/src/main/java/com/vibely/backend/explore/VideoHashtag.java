package com.vibely.backend.explore;

import com.vibely.backend.video.Video;
import jakarta.persistence.Column;
import jakarta.persistence.EmbeddedId;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.MapsId;
import jakarta.persistence.Table;
import java.time.LocalDateTime;

@Entity
@Table(name = "video_hashtags")
public class VideoHashtag {
    @EmbeddedId
    private VideoHashtagId id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @MapsId("videoId")
    @JoinColumn(name = "video_id")
    private Video video;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @MapsId("hashtagId")
    @JoinColumn(name = "hashtag_id")
    private Hashtag hashtag;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    public VideoHashtag() {
    }

    public VideoHashtag(Video video, Hashtag hashtag) {
        this.id = new VideoHashtagId(video.getId(), hashtag.getId());
        this.video = video;
        this.hashtag = hashtag;
        this.createdAt = LocalDateTime.now();
    }
}
