import { request, toQuery } from "@/shared/api/http.js";

export const chatApi = {
  getChatConversations: (token) => request("/api/chat/conversations", { token }),
  createOrGetDirectConversation: (userId, token) =>
    request(`/api/chat/conversations/direct/${userId}`, { method: "POST", token }),
  getChatMessages: (conversationId, token, { page = 0, size = 30 } = {}) =>
    request(
      `/api/chat/conversations/${conversationId}/messages${toQuery({ page, size })}`,
      { token },
    ),
  sendChatMessage: (conversationId, content, token) =>
    request(`/api/chat/conversations/${conversationId}/messages`, {
      method: "POST",
      body: { content },
      token,
    }),
  markChatConversationRead: (conversationId, token) =>
    request(`/api/chat/conversations/${conversationId}/read`, {
      method: "POST",
      token,
    }),
  acceptChatMessageRequest: (conversationId, token) =>
    request(`/api/chat/conversations/${conversationId}/accept`, {
      method: "POST",
      token,
    }),
  rejectChatMessageRequest: (conversationId, token) =>
    request(`/api/chat/conversations/${conversationId}/reject`, {
      method: "POST",
      token,
    }),
  deleteChatConversation: (conversationId, token) =>
    request(`/api/chat/conversations/${conversationId}/delete`, {
      method: "POST",
      token,
    }),
  pinChatConversation: (conversationId, token) =>
    request(`/api/chat/conversations/${conversationId}/pin`, {
      method: "POST",
      token,
    }),
  unpinChatConversation: (conversationId, token) =>
    request(`/api/chat/conversations/${conversationId}/unpin`, {
      method: "POST",
      token,
    }),
  muteChatConversation: (conversationId, token) =>
    request(`/api/chat/conversations/${conversationId}/mute`, {
      method: "POST",
      token,
    }),
  unmuteChatConversation: (conversationId, token) =>
    request(`/api/chat/conversations/${conversationId}/unmute`, {
      method: "POST",
      token,
    }),
};
