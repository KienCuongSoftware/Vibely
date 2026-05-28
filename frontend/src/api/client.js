import { resolveApiBaseUrl } from "../config/apiBase.js";

const API_BASE_URL = resolveApiBaseUrl();

const ERROR_MESSAGES_VI = {
  AUTH_REQUIRED: "Bạn cần đăng nhập để tiếp tục.",
  ACCESS_DENIED: "Bạn không có quyền thực hiện thao tác này.",
  RATE_LIMITED: "Bạn thao tác quá nhanh, vui lòng thử lại sau.",
  VALIDATION_ERROR: "Dữ liệu gửi lên chưa hợp lệ.",
  BAD_REQUEST: "Yêu cầu chưa hợp lệ, vui lòng kiểm tra lại.",
  NOT_FOUND: "Không tìm thấy dữ liệu yêu cầu.",
  INTERNAL_SERVER_ERROR: "Hệ thống đang bận, vui lòng thử lại sau.",
};

function localizeError(code, fallbackMessage) {
  const msg = String(fallbackMessage ?? "").trim();
  if (msg) return msg;
  if (code && ERROR_MESSAGES_VI[code]) {
    return ERROR_MESSAGES_VI[code];
  }
  return "Đã có lỗi xảy ra.";
}

async function request(path, { method = "GET", body, token } = {}) {
  const headers = { "Content-Type": "application/json" };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!response.ok) {
    let message = `Yêu cầu thất bại (mã ${response.status})`;
    let code;
    try {
      const payload = await response.json();
      code = payload?.error?.code;
      if (payload?.error?.message) {
        message = payload.error.message;
      } else if (payload?.message) {
        message = payload.message;
      }
    } catch {
      // Keep default message when response is not JSON.
    }
    const err = new Error(localizeError(code, message));
    err.status = response.status;
    if (code) err.code = code;
    throw err;
  }

  if (response.status === 204) {
    return null;
  }

  const payload = await response.json();
  if (Object.prototype.hasOwnProperty.call(payload, "success")) {
    if (!payload.success) {
      const code = payload?.error?.code;
      const fallbackMessage = payload?.error?.message ?? "Yêu cầu thất bại";
      throw new Error(localizeError(code, fallbackMessage));
    }
    return payload.data;
  }
  return payload;
}

/** PUT file trực tiếp lên S3 bằng URL đã ký (không qua JSON API). */
export async function uploadToPresignedPutUrl(uploadUrl, file, contentType) {
  const ct = contentType || file?.type || "application/octet-stream";
  const response = await fetch(uploadUrl, {
    method: "PUT",
    headers: { "Content-Type": ct },
    body: file,
  });
  if (!response.ok) {
    throw new Error(
      `Tải file lên kho lưu trữ thất bại (mã ${response.status}).`,
    );
  }
}

function toQuery(params = {}) {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      query.set(key, String(value));
    }
  });
  const queryString = query.toString();
  return queryString ? `?${queryString}` : "";
}

export const apiClient = {
  login: (payload) =>
    request("/api/auth/login", { method: "POST", body: payload }),
  register: (payload) =>
    request("/api/auth/register", { method: "POST", body: payload }),
  refresh: (refreshToken) =>
    request("/api/auth/refresh", { method: "POST", body: { refreshToken } }),
  logout: (refreshToken) =>
    request("/api/auth/logout", { method: "POST", body: { refreshToken } }),
  sendCode: (payload) =>
    request("/api/auth/send-code", { method: "POST", body: payload }),
  verifyCode: (payload) =>
    request("/api/auth/verify-code", { method: "POST", body: payload }),
  exchangeOAuthCode: (code) =>
    request("/api/auth/oauth/exchange", { method: "POST", body: { code } }),
  completeOnboarding: (token, payload) =>
    request("/api/auth/complete-onboarding", {
      method: "POST",
      token,
      body: payload,
    }),
  me: (token) => request("/api/auth/me", { token }),
  updateMyProfile: (token, payload) =>
    request("/api/users/me", { method: "PUT", token, body: payload }),
  checkUsername: (username) =>
    request(`/api/users/check-username${toQuery({ username })}`),
  getPublicProfile: (username, token) =>
    request(
      `/api/users/${encodeURIComponent(username)}`,
      token ? { token } : {},
    ),
  getVideosByUsername: (username, { page = 0, size = 48 } = {}) => {
    const u = String(username ?? "")
      .trim()
      .replace(/^@/, "");
    return request(
      `/api/users/${encodeURIComponent(u)}/videos${toQuery({ page, size })}`,
    );
  },
  getProfileFollowing: (username, { page = 0, size = 20, token } = {}) => {
    const u = String(username ?? "")
      .trim()
      .replace(/^@/, "");
    return request(
      `/api/users/${encodeURIComponent(u)}/following${toQuery({ page, size })}`,
      token ? { token } : {},
    );
  },
  getProfileFollowers: (username, { page = 0, size = 20, token } = {}) => {
    const u = String(username ?? "")
      .trim()
      .replace(/^@/, "");
    return request(
      `/api/users/${encodeURIComponent(u)}/followers${toQuery({ page, size })}`,
      token ? { token } : {},
    );
  },
  getSuggestedCreators: (token, { page = 0, size = 24 } = {}) =>
    request(`/api/users/me/suggested-creators${toQuery({ page, size })}`, { token }),
  getFeed: ({ size = 10, sort = "latest", cursor, token } = {}) =>
    request(`/api/feed${toQuery({ size, sort, cursor })}`, token ? { token } : {}),
  getStudioAnalyticsOverview: (token, { days = 7 } = {}) =>
    request(`/api/studio/analytics/overview${toQuery({ days })}`, { token }),
  getStudioVideoAnalytics: (token, publicId, { days = 7 } = {}) =>
    request(`/api/studio/analytics/video/${publicId}${toQuery({ days })}`, {
      token,
    }),
  getFollowingFeed: (token, { page = 0, size = 10 } = {}) =>
    request(`/api/feed/following${toQuery({ page, size })}`, { token }),
  createVideo: (payload, token) =>
    request("/api/videos", { method: "POST", body: payload, token }),
  getVideo: (publicId, { token } = {}) =>
    request(`/api/videos/${publicId}`, token ? { token } : {}),
  getVideosBySound: (audioUrl, { page = 0, size = 24 } = {}) =>
    request(`/api/videos/sound${toQuery({ audioUrl, page, size })}`),
  getVideosByHashtag: (tag, { page = 0, size = 24 } = {}) =>
    request(`/api/videos/hashtag${toQuery({ tag, page, size })}`),
  getExploreCategories: () => request("/api/explore/categories"),
  getExploreTrending: ({ cursor, size = 24 } = {}) =>
    request(`/api/explore/trending${toQuery({ cursor, size })}`),
  getExploreCategory: (slug, { cursor, size = 24 } = {}) =>
    request(`/api/explore/category/${encodeURIComponent(slug)}${toQuery({ cursor, size })}`),
  searchExplore: (q, { cursor, size = 24 } = {}) =>
    request(`/api/explore/search${toQuery({ q, cursor, size })}`),
  getExploreRelated: (publicId, { size = 18 } = {}) =>
    request(`/api/explore/video/${encodeURIComponent(publicId)}/related${toQuery({ size })}`),
  updateVideo: (publicId, payload, token) =>
    request(`/api/videos/${publicId}`, { method: "PUT", body: payload, token }),
  deleteVideo: (publicId, token) =>
    request(`/api/videos/${publicId}`, { method: "DELETE", token }),
  presignVideoUpload: (token, body) =>
    request("/api/videos/upload/presign", { method: "POST", body, token }),
  presignThumbnailUpload: (token, body) =>
    request("/api/videos/upload/presign-thumbnail", {
      method: "POST",
      body,
      token,
    }),
  likeVideo: (publicId, token) =>
    request(`/api/videos/${publicId}/likes`, { method: "POST", token }),
  unlikeVideo: (publicId, token) =>
    request(`/api/videos/${publicId}/likes`, { method: "DELETE", token }),
  bookmarkVideo: (publicId, token) =>
    request(`/api/videos/${publicId}/bookmarks`, { method: "POST", token }),
  unbookmarkVideo: (publicId, token) =>
    request(`/api/videos/${publicId}/bookmarks`, { method: "DELETE", token }),
  getVideoMeState: (publicId, token) =>
    request(`/api/videos/${publicId}/me`, { token }),
  getMyLikedVideos: (token, { page = 0, size = 24 } = {}) =>
    request(`/api/users/me/liked-videos${toQuery({ page, size })}`, { token }),
  getMyBookmarkedVideos: (token, { page = 0, size = 24 } = {}) =>
    request(`/api/users/me/bookmarked-videos${toQuery({ page, size })}`, {
      token,
    }),
  getMyUploadedVideos: (token, { page = 0, size = 24 } = {}) =>
    request(`/api/users/me/videos${toQuery({ page, size })}`, { token }),
  getComments: (publicId, { token } = {}) =>
    request(`/api/videos/${publicId}/comments`, token ? { token } : {}),
  addComment: (publicId, content, token, { parentCommentId } = {}) =>
    request(`/api/videos/${publicId}/comments`, {
      method: "POST",
      body: {
        content,
        ...(parentCommentId != null ? { parentCommentId } : {}),
      },
      token,
    }),
  deleteComment: (publicId, commentId, token) =>
    request(`/api/videos/${publicId}/comments/${commentId}`, {
      method: "DELETE",
      token,
    }),
  reportVideo: (publicId, reason, token) =>
    request(`/api/videos/${publicId}/report`, {
      method: "POST",
      body: { reason },
      token,
    }),
  follow: (userId, token) =>
    request(`/api/follows/${userId}`, { method: "POST", token }),
  unfollow: (userId, token) =>
    request(`/api/follows/${userId}`, { method: "DELETE", token }),
  getMentionableFriends: (token) => request("/api/follows/friends", { token }),
  recordVideoView: (publicId, body) =>
    request(`/api/videos/${publicId}/views`, { method: "POST", body }),
  recordVideoShare: (publicId) =>
    request(`/api/videos/${publicId}/shares`, { method: "POST" }),
  createVideoShare: (publicId, token, body) =>
    request(`/api/v1/videos/${publicId}/share`, {
      method: "POST",
      body: body ?? {},
      token,
    }),
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
};

/** Tải blob ảnh bìa lên S3 qua presign, trả về URL công khai. */
export async function uploadThumbnailToStorage(
  token,
  blob,
  fileName = "cover.jpg",
) {
  const ct =
    blob.type && String(blob.type).startsWith("image/")
      ? blob.type
      : "image/jpeg";
  const name =
    fileName && /\.(jpe?g|png|webp)$/i.test(fileName) ? fileName : "cover.jpg";
  const presign = await apiClient.presignThumbnailUpload(token, {
    contentType: ct === "image/jpg" ? "image/jpeg" : ct,
    fileName: name,
  });
  await uploadToPresignedPutUrl(presign.uploadUrl, blob, presign.contentType);
  return presign.playbackUrl;
}
