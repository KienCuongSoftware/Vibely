package com.vibely.backend.chat;

import java.time.LocalDateTime;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ChatMessageRepository extends JpaRepository<ChatMessageEntity, Long> {

    Page<ChatMessageEntity> findByConversationOrderByCreatedAtDesc(ConversationEntity conversation, Pageable pageable);

    ChatMessageEntity findTopByConversationOrderByCreatedAtDesc(ConversationEntity conversation);

    ChatMessageEntity findTopByConversationOrderByCreatedAtAsc(ConversationEntity conversation);

    boolean existsByConversationAndSender_Id(ConversationEntity conversation, Long senderId);

    long countByConversationAndSender_IdNot(ConversationEntity conversation, Long senderId);

    long countByConversationAndCreatedAtAfterAndSender_IdNot(
        ConversationEntity conversation,
        LocalDateTime createdAfter,
        Long senderId
    );
}
