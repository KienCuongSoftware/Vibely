package com.vibely.backend.auth.context;

import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface UserLoginHistoryRepository extends JpaRepository<UserLoginHistory, Long> {

    List<UserLoginHistory> findTop10ByUserIdOrderByLoginTimeDesc(Long userId);
}
