package com.vibely.backend.chat;

import com.vibely.backend.common.BadRequestException;
import com.vibely.backend.common.NotFoundException;
import com.vibely.backend.interaction.FollowRepository;
import com.vibely.backend.user.User;
import com.vibely.backend.user.UserRepository;
import java.time.LocalDateTime;
import java.util.Comparator;
import java.util.List;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class ChatService {

    private static final String DEFAULT_AVATAR = "/images/users/default-avatar.jpeg";

    private final UserRepository userRepository;
    private final ConversationRepository conversationRepository;
    private final ConversationParticipantRepository participantRepository;
    private final ChatMessageRepository messageRepository;
    private final ChatRealtimePublisher realtimePublisher;
    private final FollowRepository followRepository;

    public ChatService(
        UserRepository userRepository,
        ConversationRepository conversationRepository,
        ConversationParticipantRepository participantRepository,
        ChatMessageRepository messageRepository,
        ChatRealtimePublisher realtimePublisher,
        FollowRepository followRepository
    ) {
        this.userRepository = userRepository;
        this.conversationRepository = conversationRepository;
        this.participantRepository = participantRepository;
        this.messageRepository = messageRepository;
        this.realtimePublisher = realtimePublisher;
        this.followRepository = followRepository;
    }

    @Transactional
    public ChatConversationResponse createOrGetDirectConversation(String email, Long peerUserId) {
        if (peerUserId == null) {
            throw new BadRequestException("Không tìm thấy người dùng để nhắn tin");
        }
        User me = findUserByEmail(email);
        User peer = userRepository.findById(peerUserId)
            .orElseThrow(() -> new NotFoundException("Không tìm thấy người dùng để nhắn tin"));
        long meId = requireUserId(me);
        long peerId = requireUserId(peer);

        if (meId == peerId) {
            throw new BadRequestException("Bạn không thể tự nhắn tin với chính mình");
        }

        ConversationEntity conversation = conversationRepository
            .findDirectConversationBetweenUsers(meId, peerId)
            .orElseGet(() -> createDirectConversation(me, peer));
        ConversationParticipantEntity mine = participantRepository
            .findByConversationAndUser(conversation, me)
            .orElseThrow(() -> new NotFoundException("Không tìm thấy thành viên hội thoại"));
        if (mine.getHiddenAt() != null) {
            mine.setHiddenAt(null);
            participantRepository.save(mine);
        }

        return toConversationResponse(conversation, me);
    }

    @Transactional(readOnly = true)
    public ChatConversationListResponse getConversations(String email) {
        User me = findUserByEmail(email);
        List<ConversationParticipantEntity> mine = participantRepository
            .findByUserAndHiddenAtIsNullOrderByConversation_LastMessageAtDesc(me);

        List<ChatConversationResponse> items = mine.stream()
            .map(row -> toConversationResponse(row.getConversation(), me))
            .sorted(Comparator.comparing(ChatConversationResponse::lastMessageAt,
                Comparator.nullsLast(Comparator.reverseOrder())))
            .toList();

        return new ChatConversationListResponse(items);
    }

    @Transactional(readOnly = true)
    public ChatMessagePageResponse getMessages(String email, Long conversationId, int page, int size) {
        User me = findUserByEmail(email);
        ConversationEntity conversation = findMemberConversation(conversationId, me);

        int safePage = Math.max(0, page);
        int safeSize = Math.min(Math.max(1, size), 100);
        Page<ChatMessageEntity> rows = messageRepository
            .findByConversationOrderByCreatedAtDesc(conversation, PageRequest.of(safePage, safeSize));

        List<ChatMessageResponse> items = rows.getContent().stream()
            .map(msg -> toMessageResponse(msg, me))
            .sorted(Comparator.comparing(ChatMessageResponse::createdAt))
            .toList();

        return new ChatMessagePageResponse(items, rows.hasNext(), rows.getNumber(), rows.getSize());
    }

    @Transactional
    public ChatMessageResponse sendMessage(String email, Long conversationId, String content) {
        User me = findUserByEmail(email);
        ConversationEntity conversation = findMemberConversation(conversationId, me);
        RequestState requestState = resolveRequestState(conversation, me);

        String normalized = String.valueOf(content).trim();
        if (normalized.isBlank()) {
            throw new BadRequestException("Nội dung tin nhắn là bắt buộc");
        }
        if (!requestState.canSendMessage()) {
            throw new BadRequestException("Bạn chỉ có thể gửi 1 tin nhắn khi yêu cầu chưa được chấp nhận");
        }

        ChatMessageEntity message = new ChatMessageEntity();
        message.setConversation(conversation);
        message.setSender(me);
        message.setContent(normalized);
        ChatMessageEntity saved = messageRepository.save(message);

        LocalDateTime now = saved.getCreatedAt();
        conversation.setLastMessageAt(now);
        conversationRepository.save(conversation);

        ConversationParticipantEntity mine = participantRepository
            .findByConversationAndUser(conversation, me)
            .orElseThrow(() -> new NotFoundException("Không tìm thấy thành viên hội thoại"));
        mine.setLastReadAt(now);
        participantRepository.save(mine);

        List<ConversationParticipantEntity> participants = participantRepository.findByConversation(conversation);
        ChatMessageResponse response = toMessageResponse(saved, me);
        List<String> participantEmails = participants.stream()
            .map(p -> p.getUser().getEmail())
            .toList();
        realtimePublisher.publishNewMessage(participantEmails, response);

        return response;
    }

    @Transactional
    public void acceptMessageRequest(String email, Long conversationId) {
        User me = findUserByEmail(email);
        ConversationEntity conversation = findMemberConversation(conversationId, me);
        ConversationParticipantEntity mine = requireParticipant(conversation, me);
        RequestState requestState = resolveRequestState(conversation, me);
        if (!requestState.canAcceptMessageRequest()) {
            return;
        }
        conversation.setRequestAcceptedAt(LocalDateTime.now());
        mine.setHiddenAt(null);
        participantRepository.save(mine);
        conversationRepository.save(conversation);
    }

    @Transactional
    public void rejectMessageRequest(String email, Long conversationId) {
        User me = findUserByEmail(email);
        ConversationEntity conversation = findMemberConversation(conversationId, me);
        RequestState requestState = resolveRequestState(conversation, me);
        if (!requestState.canAcceptMessageRequest()) {
            return;
        }
        ConversationParticipantEntity mine = requireParticipant(conversation, me);
        mine.setHiddenAt(LocalDateTime.now());
        mine.setLastReadAt(LocalDateTime.now());
        participantRepository.save(mine);
    }

    @Transactional
    public void markRead(String email, Long conversationId) {
        User me = findUserByEmail(email);
        ConversationEntity conversation = findMemberConversation(conversationId, me);
        ConversationParticipantEntity mine = participantRepository
            .findByConversationAndUser(conversation, me)
            .orElseThrow(() -> new NotFoundException("Không tìm thấy thành viên hội thoại"));
        mine.setLastReadAt(LocalDateTime.now());
        participantRepository.save(mine);
    }

    private ConversationEntity createDirectConversation(User me, User peer) {
        ConversationEntity conversation = new ConversationEntity();
        conversation.setDirect(true);
        ConversationEntity saved = conversationRepository.save(conversation);

        ConversationParticipantEntity meParticipant = new ConversationParticipantEntity();
        meParticipant.setConversation(saved);
        meParticipant.setUser(me);
        meParticipant.setLastReadAt(LocalDateTime.now());
        participantRepository.save(meParticipant);

        ConversationParticipantEntity peerParticipant = new ConversationParticipantEntity();
        peerParticipant.setConversation(saved);
        peerParticipant.setUser(peer);
        participantRepository.save(peerParticipant);
        return saved;
    }

    private User findUserByEmail(String email) {
        return userRepository.findByEmail(email)
            .orElseThrow(() -> new NotFoundException("Không tìm thấy người dùng"));
    }

    private ConversationEntity findMemberConversation(Long conversationId, User me) {
        if (conversationId == null) {
            throw new NotFoundException("Không tìm thấy hội thoại");
        }
        ConversationEntity conversation = conversationRepository.findById(conversationId)
            .orElseThrow(() -> new NotFoundException("Không tìm thấy hội thoại"));
        participantRepository.findByConversationAndUser(conversation, me)
            .orElseThrow(() -> new NotFoundException("Bạn không thuộc hội thoại này"));
        return conversation;
    }

    private ConversationParticipantEntity requireParticipant(ConversationEntity conversation, User user) {
        return participantRepository
            .findByConversationAndUser(conversation, user)
            .orElseThrow(() -> new NotFoundException("Không tìm thấy thành viên hội thoại"));
    }

    private ChatConversationResponse toConversationResponse(ConversationEntity conversation, User me) {
        long meId = requireUserId(me);
        List<ConversationParticipantEntity> participants = participantRepository.findByConversation(conversation);
        User peer = participants.stream()
            .map(ConversationParticipantEntity::getUser)
            .filter(u -> requireUserId(u) != meId)
            .findFirst()
            .orElse(me);

        ChatMessageEntity last = messageRepository.findTopByConversationOrderByCreatedAtDesc(conversation);
        ConversationParticipantEntity mine = participants.stream()
            .filter(p -> p.getUser().getId().equals(me.getId()))
            .findFirst()
            .orElse(null);

        long unreadCount = 0L;
        if (mine != null) {
            if (mine.getLastReadAt() == null) {
                unreadCount = messageRepository.countByConversationAndSender_IdNot(conversation, meId);
            } else {
                unreadCount = messageRepository.countByConversationAndCreatedAtAfterAndSender_IdNot(
                    conversation,
                    mine.getLastReadAt(),
                    meId
                );
            }
        }

        RequestState requestState = resolveRequestState(conversation, me);
        return new ChatConversationResponse(
            conversation.getId(),
            conversation.isDirect(),
            requireUserId(peer),
            peer.getUsername(),
            peer.getDisplayName(),
            peer.resolveAvatarUrl(DEFAULT_AVATAR),
            last == null ? null : last.getContent(),
            conversation.getLastMessageAt(),
            unreadCount,
            requestState.messageRequest(),
            requestState.canSendMessage(),
            requestState.canAcceptMessageRequest()
        );
    }

    private RequestState resolveRequestState(ConversationEntity conversation, User viewer) {
        if (!conversation.isDirect()) {
            return new RequestState(false, true, false);
        }
        List<ConversationParticipantEntity> participants = participantRepository.findByConversation(conversation);
        long viewerId = requireUserId(viewer);
        User peer = participants.stream()
            .map(ConversationParticipantEntity::getUser)
            .filter(u -> requireUserId(u) != viewerId)
            .findFirst()
            .orElse(viewer);
        if (viewerId == requireUserId(peer)) {
            return new RequestState(false, true, false);
        }

        boolean viewerFollowsPeer = followRepository.existsByFollowerAndFollowing(viewer, peer);
        boolean peerFollowsViewer = followRepository.existsByFollowerAndFollowing(peer, viewer);
        if (viewerFollowsPeer && peerFollowsViewer) {
            return new RequestState(false, true, false);
        }

        ChatMessageEntity firstMessage = messageRepository.findTopByConversationOrderByCreatedAtAsc(conversation);
        if (firstMessage == null) {
            return new RequestState(false, true, false);
        }
        Long firstSenderId = firstMessage.getSender().getId();
        if (firstSenderId == null) {
            return new RequestState(false, true, false);
        }

        boolean accepted = conversation.getRequestAcceptedAt() != null;
        boolean viewerSentAny = messageRepository.existsByConversationAndSender_Id(conversation, viewerId);

        if (viewerId != firstSenderId) {
            boolean messageRequest = !accepted;
            return new RequestState(messageRequest, true, messageRequest);
        }

        if (accepted) {
            return new RequestState(false, true, false);
        }

        boolean canSendMessage = !viewerSentAny;
        return new RequestState(false, canSendMessage, false);
    }

    private long requireUserId(User user) {
        Long id = user.getId();
        if (id == null) {
            throw new NotFoundException("Không tìm thấy người dùng");
        }
        return id;
    }

    private ChatMessageResponse toMessageResponse(ChatMessageEntity message, User viewer) {
        User sender = message.getSender();
        return new ChatMessageResponse(
            message.getId(),
            message.getConversation().getId(),
            sender.getId(),
            sender.getUsername(),
            sender.getDisplayName(),
            sender.resolveAvatarUrl(DEFAULT_AVATAR),
            message.getContent(),
            message.getCreatedAt(),
            sender.getId().equals(viewer.getId())
        );
    }

    private record RequestState(boolean messageRequest, boolean canSendMessage, boolean canAcceptMessageRequest) {}
}
