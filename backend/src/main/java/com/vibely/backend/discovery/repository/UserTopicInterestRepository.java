package com.vibely.backend.discovery.repository;

import com.vibely.backend.discovery.model.UserTopicInterest;
import com.vibely.backend.discovery.model.UserTopicInterestId;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface UserTopicInterestRepository extends JpaRepository<UserTopicInterest, UserTopicInterestId> {
    @Query(
        value = """
            select uti from UserTopicInterest uti
            join fetch uti.topic
            where uti.user.id = :userId
            order by uti.score desc
            """,
        countQuery = "select count(uti) from UserTopicInterest uti where uti.user.id = :userId"
    )
    List<UserTopicInterest> findTopByUserId(@Param("userId") Long userId, org.springframework.data.domain.Pageable pageable);

    Optional<UserTopicInterest> findByUserIdAndTopicId(Long userId, Long topicId);
}
