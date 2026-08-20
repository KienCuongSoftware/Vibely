package com.vibely.backend.chat;

import com.vibely.backend.common.BadRequestException;
import com.vibely.backend.common.NotFoundException;
import com.vibely.backend.interaction.repository.FollowRepository;
import com.vibely.backend.user.MessageDmAudience;
import com.vibely.backend.user.entity.User;
import com.vibely.backend.user.repository.UserRepository;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import com.vibely.backend.storage.S3OwnedMediaValidator;

@Service
public class ChatService {

    private static final String DEFAULT_AVATAR = "/images/users/default-avatar.jpeg";

    private final UserRepository userRepository;
    private final ConversationRepository conversationRepository;
    private final ConversationParticipantRepository participantRepository;
    private final ChatMessageRepository messageRepository;
    private final ChatRealtimePublisher realtimePublisher;
    private final FollowRepository followRepository;
    private final S3OwnedMediaValidator ownedMediaValidator;

    public ChatService(
        UserRepository userRepository,
        ConversationRepository conversationRepository,
        ConversationParticipantRepository participantRepository,
        ChatMessageRepository messageRepository,
        ChatRealtimePublisher realtimePublisher,
        FollowRepository followRepository,
        S3OwnedMediaValidator ownedMediaValidator
    ) {
        this.userRepository = userRepository;
        this.conversationRepository = conversationRepository;
        this.participantRepository = participantRepository;
        this.messageRepository = messageRepository;
        this.realtimePublisher = realtimePublisher;
        this.followRepository = followRepository;
        this.ownedMediaValidator = ownedMediaValidator;
    }

    @Transactional
    public ChatConversationResponse createOrGetDirectConversation(String email, Long peerUserId) {
        if (peerUserId == null) {
            throw new BadRequestException("User to message not found");
        }
        User me = findUserByEmail(email);
        User peer = userRepository.findById(peerUserId)
            .orElseThrow(() -> new NotFoundException("User to message not found"));
        long meId = requireUserId(me);
        long peerId = requireUserId(peer);

        if (meId == peerId) {
            throw new BadRequestException("You cannot message yourself");
        }

        ConversationEntity conversation = conversationRepository
            .findDirectConversationBetweenUsers(meId, peerId)
            .stream()
            .sorted(Comparator
                .comparing(ConversationEntity::getLastMessageAt, Comparator.nullsLast(Comparator.reverseOrder()))
                .thenComparing(ConversationEntity::getId, Comparator.nullsLast(Comparator.reverseOrder())))
            .filter(candidate -> participantRepository
                .findByConversationAndUser(candidate, me)
                .map(participant -> participant.getHiddenAt() == null)
                .orElse(false))
            .findFirst()
            .orElse(null);

        if (conversation == null) {
            requireRecipientAllowsInboundDm(me, peer);
            conversation = createDirectConversation(me, peer);
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
            .sorted(conversationListOrder())
            .toList();
        Map<String, ChatConversationResponse> deduped = new LinkedHashMap<>();
        for (ChatConversationResponse item : items) {
            String key = item.direct()
                ? "direct:" + String.valueOf(item.peerUserId())
                : "group:" + String.valueOf(item.id());
            deduped.putIfAbsent(key, item);
        }
        return new ChatConversationListResponse(new ArrayList<>(deduped.values()));
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
            throw new BadRequestException("Message content is required");
        }
        if (!requestState.canSendMessage()) {
            throw new BadRequestException("You can only send 1 message while the request is not yet accepted");
        }

        if (conversation.isDirect()) {
            User peer = resolveDirectPeer(conversation, me);
            requireInboundDmForSend(me, peer, conversation);
        }

        if (requestState.canAcceptMessageRequest()) {
            conversation.setRequestAcceptedAt(LocalDateTime.now());
        }

        ChatMessageMedia.Parsed parsed = ChatMessageMedia.validateOutgoing(normalized, me.getId(), ownedMediaValidator);
        String storedContent = parsed.content();

        ChatMessageEntity message = new ChatMessageEntity();
        message.setConversation(conversation);
        message.setSender(me);
        message.setContent(storedContent);
        ChatMessageEntity saved = messageRepository.save(message);

        LocalDateTime now = saved.getCreatedAt();
        conversation.setLastMessageAt(now);
        conversationRepository.save(conversation);

        ConversationParticipantEntity mine = participantRepository
            .findByConversationAndUser(conversation, me)
            .orElseThrow(() -> new NotFoundException("Conversation member not found"));
        mine.setLastReadAt(now);
        participantRepository.save(mine);

        List<ConversationParticipantEntity> participants = participantRepository.findByConversation(conversation);
        ChatMessageResponse responseForSender = toMessageResponse(saved, me);
        for (ConversationParticipantEntity participant : participants) {
            User recipient = participant.getUser();
            if (recipient == null || recipient.getEmail() == null || recipient.getEmail().isBlank()) {
                continue;
            }
            // mine must be relative to each recipient — broadcasting the sender's view
            // made the other party render every new message as their own.
            ChatMessageResponse forRecipient = toMessageResponse(saved, recipient);
            realtimePublisher.publishNewMessage(List.of(recipient.getEmail()), forRecipient);
        }

        return responseForSender;
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
    public void deleteConversationForMe(String email, Long conversationId) {
        User me = findUserByEmail(email);
        ConversationEntity conversation = findMemberConversation(conversationId, me);
        LocalDateTime now = LocalDateTime.now();
        ConversationParticipantEntity mine = requireParticipant(conversation, me);
        mine.setHiddenAt(now);
        mine.setLastReadAt(now);
        participantRepository.save(mine);

        if (!conversation.isDirect()) {
            return;
        }
        long meId = requireUserId(me);
        List<ConversationParticipantEntity> participants = participantRepository.findByConversation(conversation);
        User peer = participants.stream()
            .map(ConversationParticipantEntity::getUser)
            .filter(u -> requireUserId(u) != meId)
            .findFirst()
            .orElse(null);
        if (peer == null) {
            return;
        }
        long peerId = requireUserId(peer);
        List<ConversationParticipantEntity> myVisibleParticipants =
            participantRepository.findByUserAndHiddenAtIsNullOrderByConversation_LastMessageAtDesc(me);
        for (ConversationParticipantEntity participant : myVisibleParticipants) {
            ConversationEntity current = participant.getConversation();
            if (current == null || !current.isDirect()) continue;
            List<ConversationParticipantEntity> currentParticipants = participantRepository.findByConversation(current);
            User currentPeer = currentParticipants.stream()
                .map(ConversationParticipantEntity::getUser)
                .filter(u -> requireUserId(u) != meId)
                .findFirst()
                .orElse(null);
            if (currentPeer == null) continue;
            if (requireUserId(currentPeer) != peerId) continue;
            participant.setHiddenAt(now);
            participant.setLastReadAt(now);
            participantRepository.save(participant);
        }
    }

    @Transactional
    public void markRead(String email, Long conversationId) {
        User me = findUserByEmail(email);
        ConversationEntity conversation = findMemberConversation(conversationId, me);
        ConversationParticipantEntity mine = participantRepository
            .findByConversationAndUser(conversation, me)
            .orElseThrow(() -> new NotFoundException("Conversation member not found"));
        mine.setLastReadAt(LocalDateTime.now());
        participantRepository.save(mine);
    }

    @Transactional
    public ChatConversationResponse pinConversation(String email, Long conversationId) {
        return setConversationPinned(email, conversationId, true);
    }

    @Transactional
    public ChatConversationResponse unpinConversation(String email, Long conversationId) {
        return setConversationPinned(email, conversationId, false);
    }

    @Transactional
    public ChatConversationResponse muteConversation(String email, Long conversationId) {
        return setConversationMuted(email, conversationId, true);
    }

    @Transactional
    public ChatConversationResponse unmuteConversation(String email, Long conversationId) {
        return setConversationMuted(email, conversationId, false);
    }

    private ChatConversationResponse setConversationPinned(String email, Long conversationId, boolean pinned) {
        User me = findUserByEmail(email);
        ConversationEntity conversation = findMemberConversation(conversationId, me);
        ConversationParticipantEntity mine = requireParticipant(conversation, me);
        mine.setPinnedAt(pinned ? LocalDateTime.now() : null);
        participantRepository.save(mine);
        return toConversationResponse(conversation, me);
    }

    private ChatConversationResponse setConversationMuted(String email, Long conversationId, boolean muted) {
        User me = findUserByEmail(email);
        ConversationEntity conversation = findMemberConversation(conversationId, me);
        ConversationParticipantEntity mine = requireParticipant(conversation, me);
        mine.setMutedAt(muted ? LocalDateTime.now() : null);
        participantRepository.save(mine);
        return toConversationResponse(conversation, me);
    }

    private static Comparator<ChatConversationResponse> conversationListOrder() {
        return Comparator
            .comparing(ChatConversationResponse::pinned, Comparator.reverseOrder())
            .thenComparing(
                ChatConversationResponse::lastMessageAt,
                Comparator.nullsLast(Comparator.reverseOrder())
            );
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
            .orElseThrow(() -> new NotFoundException("User not found"));
    }

    private ConversationEntity findMemberConversation(Long conversationId, User me) {
        if (conversationId == null) {
            throw new NotFoundException("Conversation not found");
        }
        ConversationEntity conversation = conversationRepository.findById(conversationId)
            .orElseThrow(() -> new NotFoundException("Conversation not found"));
        participantRepository.findByConversationAndUser(conversation, me)
            .orElseThrow(() -> new NotFoundException("You are not a member of this conversation"));
        return conversation;
    }

    private ConversationParticipantEntity requireParticipant(ConversationEntity conversation, User user) {
        return participantRepository
            .findByConversationAndUser(conversation, user)
            .orElseThrow(() -> new NotFoundException("Conversation member not found"));
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
        boolean pinned = mine != null && mine.getPinnedAt() != null;
        boolean muted = mine != null && mine.getMutedAt() != null;
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
            requestState.canAcceptMessageRequest(),
            pinned,
            muted
        );
    }

    private User resolveDirectPeer(ConversationEntity conversation, User viewer) {
        long viewerId = requireUserId(viewer);
        return participantRepository.findByConversation(conversation).stream()
            .map(ConversationParticipantEntity::getUser)
            .filter(u -> requireUserId(u) != viewerId)
            .findFirst()
            .orElse(viewer);
    }

    /**
     * Bạn bè (follow lẫn nhau) và accounts you follow luôn nhắn được.
     * Kết nối tiềm năng = follower của bạn; người khác = không có quan hệ follow.
     */
    private void requireRecipientAllowsInboundDm(User sender, User recipient) {
        if (isAlwaysAllowedDm(sender, recipient)) {
            return;
        }
        boolean senderFollowsRecipient = followRepository.existsAcceptedByFollowerAndFollowing(sender, recipient);
        if (senderFollowsRecipient) {
            if (!MessageDmAudience.allowsMessaging(recipient.getDmPotentialAudience())) {
                throw new BadRequestException("This person does not accept messages from potential connections.");
            }
            return;
        }
        if (!MessageDmAudience.allowsMessaging(recipient.getDmOthersAudience())) {
            throw new BadRequestException("This person does not accept messages from strangers.");
        }
    }

    private void requireInboundDmForSend(User sender, User recipient, ConversationEntity conversation) {
        if (isAlwaysAllowedDm(sender, recipient)) {
            return;
        }
        if (conversation.getRequestAcceptedAt() != null) {
            return;
        }
        long recipientId = requireUserId(recipient);
        if (messageRepository.existsByConversationAndSender_Id(conversation, recipientId)) {
            return;
        }
        requireRecipientAllowsInboundDm(sender, recipient);
    }

    private boolean isAlwaysAllowedDm(User sender, User recipient) {
        boolean senderFollowsRecipient = followRepository.existsAcceptedByFollowerAndFollowing(sender, recipient);
        boolean recipientFollowsSender = followRepository.existsAcceptedByFollowerAndFollowing(recipient, sender);
        // Bạn bè (mutual) hoặc người nhận đang follow người gửi ("accounts you follow")
        return (senderFollowsRecipient && recipientFollowsSender) || recipientFollowsSender;
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

        if (isAlwaysAllowedDm(viewer, peer)) {
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
            throw new NotFoundException("User not found");
        }
        return id;
    }

    private ChatMessageResponse toMessageResponse(ChatMessageEntity message, User viewer) {
        User sender = message.getSender();
        ChatMessageMedia.Parsed parsed = ChatMessageMedia.parse(message.getContent());
        String mediaCaption = parsed.type() == ChatMessageMedia.Type.VIDEO ? parsed.caption() : null;
        return new ChatMessageResponse(
            message.getId(),
            message.getConversation().getId(),
            sender.getId(),
            sender.getUsername(),
            sender.getDisplayName(),
            sender.resolveAvatarUrl(DEFAULT_AVATAR),
            message.getContent(),
            message.getCreatedAt(),
            sender.getId().equals(viewer.getId()),
            parsed.type().name(),
            parsed.mediaUrl(),
            mediaCaption
        );
    }

    private record RequestState(boolean messageRequest, boolean canSendMessage, boolean canAcceptMessageRequest) {}
}
