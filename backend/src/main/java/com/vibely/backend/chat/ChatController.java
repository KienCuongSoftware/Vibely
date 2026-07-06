package com.vibely.backend.chat;

import com.vibely.backend.common.ApiResponse;
import jakarta.validation.Valid;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/chat")
@PreAuthorize("hasRole('USER')")
public class ChatController {

    private final ChatService chatService;

    public ChatController(ChatService chatService) {
        this.chatService = chatService;
    }

    @GetMapping("/conversations")
    public ApiResponse<ChatConversationListResponse> getConversations(Authentication authentication) {
        return ApiResponse.success(chatService.getConversations(authentication.getName()));
    }

    @PostMapping("/conversations/direct/{userId}")
    public ApiResponse<ChatConversationResponse> createOrGetDirectConversation(
        Authentication authentication,
        @PathVariable Long userId
    ) {
        return ApiResponse.success(chatService.createOrGetDirectConversation(authentication.getName(), userId));
    }

    @GetMapping("/conversations/{conversationId}/messages")
    public ApiResponse<ChatMessagePageResponse> getMessages(
        Authentication authentication,
        @PathVariable Long conversationId,
        @RequestParam(defaultValue = "0") int page,
        @RequestParam(defaultValue = "30") int size
    ) {
        return ApiResponse.success(chatService.getMessages(authentication.getName(), conversationId, page, size));
    }

    @PostMapping("/conversations/{conversationId}/messages")
    public ApiResponse<ChatMessageResponse> sendMessage(
        Authentication authentication,
        @PathVariable Long conversationId,
        @Valid @RequestBody SendChatMessageRequest request
    ) {
        return ApiResponse.success(chatService.sendMessage(authentication.getName(), conversationId, request.getContent()));
    }

    @PostMapping("/conversations/{conversationId}/read")
    public ApiResponse<Void> markRead(Authentication authentication, @PathVariable Long conversationId) {
        chatService.markRead(authentication.getName(), conversationId);
        return ApiResponse.success(null);
    }

    @PostMapping("/conversations/{conversationId}/accept")
    public ApiResponse<Void> acceptMessageRequest(Authentication authentication, @PathVariable Long conversationId) {
        chatService.acceptMessageRequest(authentication.getName(), conversationId);
        return ApiResponse.success(null);
    }

    @PostMapping("/conversations/{conversationId}/reject")
    public ApiResponse<Void> rejectMessageRequest(Authentication authentication, @PathVariable Long conversationId) {
        chatService.rejectMessageRequest(authentication.getName(), conversationId);
        return ApiResponse.success(null);
    }

    @PostMapping("/conversations/{conversationId}/delete")
    public ApiResponse<Void> deleteConversation(Authentication authentication, @PathVariable Long conversationId) {
        chatService.deleteConversationForMe(authentication.getName(), conversationId);
        return ApiResponse.success(null);
    }

    @PostMapping("/conversations/{conversationId}/pin")
    public ApiResponse<ChatConversationResponse> pinConversation(
        Authentication authentication,
        @PathVariable Long conversationId
    ) {
        return ApiResponse.success(chatService.pinConversation(authentication.getName(), conversationId));
    }

    @PostMapping("/conversations/{conversationId}/unpin")
    public ApiResponse<ChatConversationResponse> unpinConversation(
        Authentication authentication,
        @PathVariable Long conversationId
    ) {
        return ApiResponse.success(chatService.unpinConversation(authentication.getName(), conversationId));
    }
}
