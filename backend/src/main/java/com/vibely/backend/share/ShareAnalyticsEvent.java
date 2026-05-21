package com.vibely.backend.share;

import com.vibely.backend.video.Video;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import java.time.OffsetDateTime;
import java.util.UUID;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

@Entity
@Table(name = "share_analytics")
public class ShareAnalyticsEvent {

    @Id
    @Column(nullable = false)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "video_id", nullable = false)
    private Video video;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "short_link_id")
    private ShortLink shortLink;

    @Column(name = "video_share_id")
    private UUID videoShareId;

    @Column(name = "redirect_log_id")
    private UUID redirectLogId;

    @Enumerated(EnumType.STRING)
    @Column(name = "event_type", nullable = false, length = 32)
    private ShareEventType eventType;

    @Column(length = 32)
    private String channel;

    @Column(name = "share_source", length = 32)
    private String shareSource;

    @Column(name = "device_class", length = 32)
    private String deviceClass;

    @Column(name = "browser_family", length = 64)
    private String browserFamily;

    @Column(name = "os_family", length = 64)
    private String osFamily;

    @Column(name = "country_code", length = 2)
    private String countryCode;

    @Column(length = 2048)
    private String referrer;

    @Column(name = "visitor_key", length = 64)
    private String visitorKey;

    @Column(name = "ip_hash", length = 64)
    private String ipHash;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(columnDefinition = "jsonb")
    private String metadata;

    @Column(name = "event_at", nullable = false)
    private OffsetDateTime eventAt;

    @PrePersist
    void prePersist() {
        if (id == null) {
            id = UuidV7.generate();
        }
        if (eventAt == null) {
            eventAt = OffsetDateTime.now();
        }
    }

    public UUID getId() {
        return id;
    }

    public void setId(UUID id) {
        this.id = id;
    }

    public Video getVideo() {
        return video;
    }

    public void setVideo(Video video) {
        this.video = video;
    }

    public ShortLink getShortLink() {
        return shortLink;
    }

    public void setShortLink(ShortLink shortLink) {
        this.shortLink = shortLink;
    }

    public UUID getVideoShareId() {
        return videoShareId;
    }

    public void setVideoShareId(UUID videoShareId) {
        this.videoShareId = videoShareId;
    }

    public UUID getRedirectLogId() {
        return redirectLogId;
    }

    public void setRedirectLogId(UUID redirectLogId) {
        this.redirectLogId = redirectLogId;
    }

    public ShareEventType getEventType() {
        return eventType;
    }

    public void setEventType(ShareEventType eventType) {
        this.eventType = eventType;
    }

    public String getChannel() {
        return channel;
    }

    public void setChannel(String channel) {
        this.channel = channel;
    }

    public String getShareSource() {
        return shareSource;
    }

    public void setShareSource(String shareSource) {
        this.shareSource = shareSource;
    }

    public String getDeviceClass() {
        return deviceClass;
    }

    public void setDeviceClass(String deviceClass) {
        this.deviceClass = deviceClass;
    }

    public String getBrowserFamily() {
        return browserFamily;
    }

    public void setBrowserFamily(String browserFamily) {
        this.browserFamily = browserFamily;
    }

    public String getOsFamily() {
        return osFamily;
    }

    public void setOsFamily(String osFamily) {
        this.osFamily = osFamily;
    }

    public String getCountryCode() {
        return countryCode;
    }

    public void setCountryCode(String countryCode) {
        this.countryCode = countryCode;
    }

    public String getReferrer() {
        return referrer;
    }

    public void setReferrer(String referrer) {
        this.referrer = referrer;
    }

    public String getVisitorKey() {
        return visitorKey;
    }

    public void setVisitorKey(String visitorKey) {
        this.visitorKey = visitorKey;
    }

    public String getIpHash() {
        return ipHash;
    }

    public void setIpHash(String ipHash) {
        this.ipHash = ipHash;
    }

    public String getMetadata() {
        return metadata;
    }

    public void setMetadata(String metadata) {
        this.metadata = metadata;
    }

    public OffsetDateTime getEventAt() {
        return eventAt;
    }

    public void setEventAt(OffsetDateTime eventAt) {
        this.eventAt = eventAt;
    }
}
