export const IMAGE_MESSAGE_PREFIX = "__img__:";
export const VIDEO_MESSAGE_PREFIX = "__vid__:";
export const SHARED_VIDEO_ID_PREFIX = "__vshare__:";
export const MAX_MEDIA_VIDEO_SECONDS = 15;

export function buildPendingMediaItem(file, selectionOrder) {
  const type = String(file?.type ?? "");
  if (!type.startsWith("image/") && !type.startsWith("video/")) return null;
  return {
    file,
    previewUrl: URL.createObjectURL(file),
    kind: type.startsWith("video/") ? "video" : "image",
    durationSeconds: 0,
    tooLong: false,
    selectionOrder,
  };
}

export function readVideoDurationSeconds(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const video = document.createElement("video");
    video.preload = "metadata";
    video.onloadedmetadata = () => {
      const duration = Number(video.duration);
      URL.revokeObjectURL(url);
      resolve(Number.isFinite(duration) ? duration : 0);
    };
    video.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Không thể đọc thời lượng video."));
    };
    video.src = url;
  });
}

export function formatDuration(seconds) {
  const safe = Math.max(0, Math.floor(Number(seconds) || 0));
  const mm = String(Math.floor(safe / 60)).padStart(2, "0");
  const ss = String(safe % 60).padStart(2, "0");
  return `${mm}:${ss}`;
}

export function extractImageMessageUrl(content) {
  const value = String(content ?? "");
  if (!value.startsWith(IMAGE_MESSAGE_PREFIX)) return null;
  const url = value.slice(IMAGE_MESSAGE_PREFIX.length).trim();
  return url || null;
}

export function extractVideoMessageUrl(content) {
  const value = String(content ?? "");
  if (!value.startsWith(VIDEO_MESSAGE_PREFIX)) return null;
  const payload = value.slice(VIDEO_MESSAGE_PREFIX.length).trim();
  if (!payload) return null;
  const [firstLine] = payload.split(/\r?\n/, 1);
  const url = String(firstLine ?? "").trim();
  return url || null;
}

export function extractVideoMessageCaption(content) {
  const value = String(content ?? "");
  if (!value.startsWith(VIDEO_MESSAGE_PREFIX)) return "";
  const payload = value.slice(VIDEO_MESSAGE_PREFIX.length).trim();
  if (!payload) return "";
  const lines = payload.split(/\r?\n/);
  return lines.slice(1).join("\n").trim();
}

export function extractSharedVideoId(content) {
  const value = String(content ?? "");
  if (!value.startsWith(SHARED_VIDEO_ID_PREFIX)) return "";
  const payload = value.slice(SHARED_VIDEO_ID_PREFIX.length).trim();
  if (!payload) return "";
  const [firstLine] = payload.split(/\r?\n/, 1);
  return String(firstLine ?? "").trim();
}

export function extractSharedVideoCaption(content) {
  const value = String(content ?? "");
  if (!value.startsWith(SHARED_VIDEO_ID_PREFIX)) return "";
  const payload = value.slice(SHARED_VIDEO_ID_PREFIX.length).trim();
  if (!payload) return "";
  const lines = payload.split(/\r?\n/);
  return lines.slice(1).join("\n").trim();
}

export function toConversationPreview(msgOrContent) {
  const content = typeof msgOrContent === "string" ? msgOrContent : msgOrContent?.content;
  const mediaType = typeof msgOrContent === "string" ? null : msgOrContent?.mediaType;
  if (mediaType === "IMAGE" || extractImageMessageUrl(content)) return "Đã gửi một ảnh";
  if (mediaType === "VIDEO" || extractVideoMessageUrl(content)) return "Đã gửi một video";
  if (extractSharedVideoId(content)) return "Đã chia sẻ một video";
  return content || "Bắt đầu cuộc trò chuyện";
}

export function formatTime(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" });
}

export function upsertMessage(list, incoming) {
  const key = Number(incoming?.id);
  if (!Number.isFinite(key)) return list;
  const exists = list.some((m) => Number(m?.id) === key);
  if (exists) return list;
  return [...list, incoming].sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
}

export function conversationAfterOutgoingMessage(conv, sent) {
  const wasAcceptingReply = Boolean(conv.canAcceptMessageRequest || conv.messageRequest);
  return {
    ...conv,
    lastMessage: sent.content,
    lastMessageAt: sent.createdAt,
    unreadCount: 0,
    messageRequest: false,
    canAcceptMessageRequest: false,
    canSendMessage: wasAcceptingReply ? true : Boolean(conv.canSendMessage ?? true),
  };
}

/** Human-readable preview for inbox rows and notifications. */
export function formatChatMessagePreview(message) {
  return toConversationPreview(message);
}

/** Whether the toast should show a video thumbnail on the right. */
export function chatMessageHasVideoPreview(message) {
  const mediaType = String(message?.mediaType ?? "").toUpperCase();
  if (mediaType === "VIDEO" && message?.mediaUrl) return true;
  return Boolean(extractSharedVideoId(message?.content));
}

/** Direct video URL for uploaded chat videos (not shared feed videos). */
export function getChatMessageDirectVideoUrl(message) {
  const mediaType = String(message?.mediaType ?? "").toUpperCase();
  if (mediaType === "VIDEO" && message?.mediaUrl) {
    return String(message.mediaUrl).trim();
  }
  return extractVideoMessageUrl(message?.content) || "";
}

export function getChatMessageSharedVideoId(message) {
  return extractSharedVideoId(message?.content);
}
