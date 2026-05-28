package com.vibely.backend.chat;

import com.vibely.backend.user.User;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ConversationParticipantRepository extends JpaRepository<ConversationParticipantEntity, Long> {

    List<ConversationParticipantEntity> findByUserAndHiddenAtIsNullOrderByConversation_LastMessageAtDesc(User user);

    List<ConversationParticipantEntity> findByConversation(ConversationEntity conversation);

    Optional<ConversationParticipantEntity> findByConversationAndUser(ConversationEntity conversation, User user);
}
