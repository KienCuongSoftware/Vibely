const IMAGE_MESSAGE_PREFIX = "__img__:";
const VIDEO_MESSAGE_PREFIX = "__vid__:";
const SHARED_VIDEO_ID_PREFIX = "__vshare__:";

function extractVideoMessageUrl(content) {
  const value = String(content ?? "");
  if (!value.startsWith(VIDEO_MESSAGE_PREFIX)) return null;
  const payload = value.slice(VIDEO_MESSAGE_PREFIX.length).trim();
  if (!payload) return null;
  const [firstLine] = payload.split(/\r?\n/, 1);
  const url = String(firstLine ?? "").trim();
  return url || null;
}

function extractSharedVideoId(content) {
  const value = String(content ?? "");
  if (!value.startsWith(SHARED_VIDEO_ID_PREFIX)) return "";
  const payload = value.slice(SHARED_VIDEO_ID_PREFIX.length).trim();
  if (!payload) return "";
  const [firstLine] = payload.split(/\r?\n/, 1);
  return String(firstLine ?? "").trim();
}

/** Human-readable preview for inbox rows and notifications. */
export function formatChatMessagePreview(message) {
  const content = message?.content ?? "";
  const mediaType = String(message?.mediaType ?? "").toUpperCase();
  if (mediaType === "IMAGE" || content.startsWith(IMAGE_MESSAGE_PREFIX)) {
    return "Đã gửi một ảnh";
  }
  if (mediaType === "VIDEO" || extractVideoMessageUrl(content)) {
    return "Đã gửi một video";
  }
  if (extractSharedVideoId(content)) {
    return "Đã chia sẻ một video";
  }
  const text = String(content ?? "").trim();
  return text || "Bắt đầu cuộc trò chuyện";
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
