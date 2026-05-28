package com.vibely.backend.antibot.persistence;

import com.vibely.backend.antibot.persistence.entity.AntiBotDeviceFingerprintEntity;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface AntiBotDeviceFingerprintRepository extends JpaRepository<AntiBotDeviceFingerprintEntity, Long> {
    Optional<AntiBotDeviceFingerprintEntity> findByDeviceHash(String deviceHash);
}
