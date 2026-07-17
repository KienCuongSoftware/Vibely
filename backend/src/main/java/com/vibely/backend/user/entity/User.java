package com.vibely.backend.user.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;
import java.time.LocalDate;
import java.time.LocalDateTime;
import org.springframework.util.StringUtils;

@Entity
@Table(name = "users")
public class User {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true, length = 50)
    private String username;

    @Column(name = "display_name", nullable = false, length = 80)
    private String displayName;

    @Column(nullable = false, unique = true, length = 120)
    private String email;

    @Column(name = "password_hash", nullable = false, length = 255)
    private String passwordHash;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private Role role = Role.USER;

    @Enumerated(EnumType.STRING)
    @Column(name = "account_status", nullable = false, length = 20)
    private UserAccountStatus accountStatus = UserAccountStatus.ACTIVE;

    @Column(name = "deactivated_at")
    private LocalDateTime deactivatedAt;

    @Column(name = "ban_reason", length = 500)
    private String banReason;

    @Column(name = "banned_at")
    private LocalDateTime bannedAt;

    @Column(name = "banned_by_admin_id")
    private Long bannedByAdminId;

    @Column(length = 300)
    private String bio;

    @Column(name = "avatar_url", length = 512)
    private String avatarUrl;

    @Column(name = "google_avatar_url", length = 512)
    private String googleAvatarUrl;

    @Column(name = "birth_date")
    private LocalDate birthDate;

    @Column(name = "onboarding_completed", nullable = false)
    private boolean onboardingCompleted = false;

    @Column(name = "private_account", nullable = false)
    private boolean privateAccount = false;

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

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getUsername() {
        return username;
    }

    public void setUsername(String username) {
        this.username = username;
    }

    public String getDisplayName() {
        return displayName;
    }

    public void setDisplayName(String displayName) {
        this.displayName = displayName;
    }

    public String getEmail() {
        return email;
    }

    public void setEmail(String email) {
        this.email = email;
    }

    public String getPasswordHash() {
        return passwordHash;
    }

    public void setPasswordHash(String passwordHash) {
        this.passwordHash = passwordHash;
    }

    public String getBio() {
        return bio;
    }

    public Role getRole() {
        return role;
    }

    public void setRole(Role role) {
        this.role = role;
    }

    public UserAccountStatus getAccountStatus() {
        return accountStatus;
    }

    public void setAccountStatus(UserAccountStatus accountStatus) {
        this.accountStatus = accountStatus;
    }

    public boolean isActive() {
        return accountStatus == null || accountStatus == UserAccountStatus.ACTIVE;
    }

    public boolean isBanned() {
        return accountStatus == UserAccountStatus.BANNED;
    }

    public String getBanReason() {
        return banReason;
    }

    public void setBanReason(String banReason) {
        this.banReason = banReason;
    }

    public LocalDateTime getBannedAt() {
        return bannedAt;
    }

    public void setBannedAt(LocalDateTime bannedAt) {
        this.bannedAt = bannedAt;
    }

    public Long getBannedByAdminId() {
        return bannedByAdminId;
    }

    public void setBannedByAdminId(Long bannedByAdminId) {
        this.bannedByAdminId = bannedByAdminId;
    }

    public LocalDateTime getDeactivatedAt() {
        return deactivatedAt;
    }

    public void setDeactivatedAt(LocalDateTime deactivatedAt) {
        this.deactivatedAt = deactivatedAt;
    }

    public void setBio(String bio) {
        this.bio = bio;
    }

    public String getAvatarUrl() {
        return avatarUrl;
    }

    public void setAvatarUrl(String avatarUrl) {
        this.avatarUrl = avatarUrl;
    }

    public String getGoogleAvatarUrl() {
        return googleAvatarUrl;
    }

    public void setGoogleAvatarUrl(String googleAvatarUrl) {
        this.googleAvatarUrl = googleAvatarUrl;
    }

    public LocalDate getBirthDate() {
        return birthDate;
    }

    public void setBirthDate(LocalDate birthDate) {
        this.birthDate = birthDate;
    }

    public boolean isOnboardingCompleted() {
        return onboardingCompleted;
    }

    public void setOnboardingCompleted(boolean onboardingCompleted) {
        this.onboardingCompleted = onboardingCompleted;
    }

    public boolean isPrivateAccount() {
        return privateAccount;
    }

    public void setPrivateAccount(boolean privateAccount) {
        this.privateAccount = privateAccount;
    }

    /**
     * Prefer custom uploaded avatar over OAuth (Google/Facebook) photo.
     * Matches {@link com.vibely.backend.auth.service.UserAvatarResolver}.
     */
    public String resolveAvatarUrl(String fallbackAvatarUrl) {
        if (StringUtils.hasText(avatarUrl)) {
            return avatarUrl;
        }
        if (StringUtils.hasText(googleAvatarUrl)) {
            return googleAvatarUrl;
        }
        return fallbackAvatarUrl;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public LocalDateTime getUpdatedAt() {
        return updatedAt;
    }
}
