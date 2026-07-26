package com.vibely.backend.user.repository;

import com.vibely.backend.user.entity.User;
import com.vibely.backend.user.entity.UserDataExportRequest;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface UserDataExportRequestRepository extends JpaRepository<UserDataExportRequest, Long> {

    List<UserDataExportRequest> findByUserOrderByCreatedAtDesc(User user);

    Optional<UserDataExportRequest> findByIdAndUser(Long id, User user);

    boolean existsByUserAndStatus(User user, String status);
}
