package com.vibely.backend.notification;

import com.vibely.backend.user.User;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.Id;
import jakarta.persistence.IdClass;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import java.io.Serializable;
import java.time.LocalDateTime;
import java.util.Objects;

@Entity
@Table(name = "user_notification_actors")
@IdClass(UserNotificationActorEntity.Pk.class)
public class UserNotificationActorEntity {

    @Id
    @Column(name = "notification_id")
    private Long notificationId;

    @Id
    @Column(name = "actor_id")
    private Long actorId;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "notification_id", insertable = false, updatable = false)
    private UserNotificationEntity notification;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "actor_id", insertable = false, updatable = false)
    private User actor;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @PrePersist
    void prePersist() {
        if (createdAt == null) {
            createdAt = LocalDateTime.now();
        }
    }

    public static UserNotificationActorEntity of(Long notificationId, Long actorId) {
        UserNotificationActorEntity row = new UserNotificationActorEntity();
        row.notificationId = notificationId;
        row.actorId = actorId;
        return row;
    }

    public Long getNotificationId() {
        return notificationId;
    }

    public Long getActorId() {
        return actorId;
    }

    public User getActor() {
        return actor;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public static final class Pk implements Serializable {
        private Long notificationId;
        private Long actorId;

        public Pk() {}

        public Pk(Long notificationId, Long actorId) {
            this.notificationId = notificationId;
            this.actorId = actorId;
        }

        @Override
        public boolean equals(Object other) {
            if (this == other) {
                return true;
            }
            if (!(other instanceof Pk that)) {
                return false;
            }
            return Objects.equals(notificationId, that.notificationId)
                && Objects.equals(actorId, that.actorId);
        }

        @Override
        public int hashCode() {
            return Objects.hash(notificationId, actorId);
        }
    }
}
