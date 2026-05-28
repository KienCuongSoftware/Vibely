package com.vibely.backend.chat;

import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface ConversationRepository extends JpaRepository<ConversationEntity, Long> {

    @Query("""
        select c from ConversationEntity c
        where c.direct = true
          and c.id in (
            select cp1.conversation.id from ConversationParticipantEntity cp1
            where cp1.user.id = :userA
          )
          and c.id in (
            select cp2.conversation.id from ConversationParticipantEntity cp2
            where cp2.user.id = :userB
          )
        """)
    List<ConversationEntity> findDirectConversationBetweenUsers(
        @Param("userA") Long userA,
        @Param("userB") Long userB
    );
}
