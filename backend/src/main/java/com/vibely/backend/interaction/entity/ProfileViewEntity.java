package com.vibely.backend.interaction.entity;

import com.vibely.backend.user.entity.User;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import java.time.LocalDateTime;

@Entity
@Table(name = "profile_views")
public class ProfileViewEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "profile_user_id", nullable = false)
    private User profileUser;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "viewer_user_id")
    private User viewerUser;

    @Column(name = "viewer_key", nullable = false, length = 64)
    private String viewerKey;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @PrePersist
    void prePersist() {
        if (createdAt == null) {
            createdAt = LocalDateTime.now();
        }
    }

    public Long getId() {
        return id;
    }

    public User getProfileUser() {
        return profileUser;
    }

    public void setProfileUser(User profileUser) {
        this.profileUser = profileUser;
    }

    public User getViewerUser() {
        return viewerUser;
    }

    public void setViewerUser(User viewerUser) {
        this.viewerUser = viewerUser;
    }

    public String getViewerKey() {
        return viewerKey;
    }

    public void setViewerKey(String viewerKey) {
        this.viewerKey = viewerKey;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }
}
