package com.vibely.backend.notification;

import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface UserNotificationActorRepository extends JpaRepository<UserNotificationActorEntity, UserNotificationActorEntity.Pk> {

    boolean existsByNotificationIdAndActorId(Long notificationId, Long actorId);

    void deleteByNotificationIdAndActorId(Long notificationId, Long actorId);

    void deleteByNotificationId(Long notificationId);

    long countByNotificationId(Long notificationId);

    Optional<UserNotificationActorEntity> findFirstByNotificationIdOrderByCreatedAtDescActorIdDesc(
        Long notificationId
    );
}
