import { isCookieSession } from "../auth/session.js";
import { buildApiUrl } from "../config/apiBase.js";

const ERROR_MESSAGES_VI = {
  AUTH_REQUIRED: "Bạn cần đăng nhập để tiếp tục.",
  ACCESS_DENIED: "Bạn không có quyền thực hiện thao tác này.",
  RATE_LIMITED: "Bạn thao tác quá nhanh, vui lòng thử lại sau.",
  CAPTCHA_REQUIRED: "Yêu cầu xác minh captcha trước khi tiếp tục.",
  ACCOUNT_BANNED: "Tài khoản của bạn đã bị cấm.",
  VALIDATION_ERROR: "Dữ liệu gửi lên chưa hợp lệ.",
  BAD_REQUEST: "Yêu cầu chưa hợp lệ, vui lòng kiểm tra lại.",
  NOT_FOUND: "Không tìm thấy dữ liệu yêu cầu.",
  INTERNAL_SERVER_ERROR: "Hệ thống đang bận, vui lòng thử lại sau.",
};

const LEGACY_ACCESS_DENIED_MESSAGE = "Bạn không có quyền truy cập tài nguyên này";

function localizeError(code, fallbackMessage, status) {
  const msg = String(fallbackMessage ?? "").trim();
  if (msg && msg !== LEGACY_ACCESS_DENIED_MESSAGE) {
    return msg;
  }
  if (code && ERROR_MESSAGES_VI[code]) {
    return ERROR_MESSAGES_VI[code];
  }
  if (status === 401) {
    return ERROR_MESSAGES_VI.AUTH_REQUIRED;
  }
  if (status === 403) {
    return ERROR_MESSAGES_VI.ACCESS_DENIED;
  }
  if (status >= 500) {
    return ERROR_MESSAGES_VI.INTERNAL_SERVER_ERROR;
  }
  return "Đã có lỗi xảy ra. Vui lòng thử lại.";
}

function readCsrfToken() {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(/(?:^|;\s*)XSRF-TOKEN=([^;]+)/);
  return match ? decodeURIComponent(match[1]) : null;
}

async function ensureCsrfCookie() {
  if (typeof document === "undefined" || readCsrfToken()) return;
  try {
    await fetch(buildApiUrl("/api/health"), { credentials: "include" });
  } catch {
    /* health probe is best-effort */
  }
}

async function request(path, { method = "GET", body, token, headers: extraHeaders } = {}) {
  const headers = { "Content-Type": "application/json", ...(extraHeaders || {}) };
  if (token && !isCookieSession(token)) {
    headers.Authorization = `Bearer ${token}`;
  }
  const upperMethod = String(method).toUpperCase();
  if (upperMethod !== "GET" && upperMethod !== "HEAD" && upperMethod !== "OPTIONS") {
    await ensureCsrfCookie();
    const csrf = readCsrfToken();
    if (csrf) {
      headers["X-XSRF-TOKEN"] = csrf;
    }
  }

  const response = await fetch(buildApiUrl(path), {
    method,
    headers,
    credentials: "include",
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!response.ok) {
    let message = `Yêu cầu thất bại (mã ${response.status})`;
    let code;
    let captchaRequired;
    let errorData;
    try {
      const payload = await response.json();
      code = payload?.error?.code;
      errorData = payload?.data;
      captchaRequired = payload?.data;
      if (payload?.error?.message) {
        message = payload.error.message;
      } else if (payload?.message) {
        message = payload.message;
      }
    } catch {
      // Keep default message when response is not JSON.
    }
    const err = new Error(localizeError(code, message, response.status));
    err.status = response.status;
    if (errorData) err.data = errorData;
    if (code) err.code = code;
    if (captchaRequired && (response.status === 428 || code === "CAPTCHA_REQUIRED")) {
      err.captchaRequired = captchaRequired;
    }
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
      throw new Error(localizeError(code, fallbackMessage, response.status));
    }
    return payload.data;
  }
  return payload;
}

/** PUT file trực tiếp lên S3 bằng URL đã ký (không qua JSON API). */
export function uploadToPresignedPutUrl(uploadUrl, file, contentType, onProgress) {
  const ct = contentType || file?.type || "application/octet-stream";
  if (typeof onProgress !== "function") {
    return fetch(uploadUrl, {
      method: "PUT",
      headers: { "Content-Type": ct },
      body: file,
    }).then((response) => {
      if (!response.ok) {
        throw new Error(
          `Tải file lên kho lưu trữ thất bại (mã ${response.status}).`,
        );
      }
    });
  }

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", uploadUrl);
    xhr.setRequestHeader("Content-Type", ct);
    xhr.upload.onprogress = (event) => {
      if (!event.lengthComputable) return;
      const percent = Math.max(
        0,
        Math.min(100, Math.round((event.loaded / event.total) * 100)),
      );
      onProgress(percent);
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        onProgress(100);
        resolve();
        return;
      }
      reject(
        new Error(`Tải file lên kho lưu trữ thất bại (mã ${xhr.status}).`),
      );
    };
    xhr.onerror = () => {
      reject(new Error("Tải file lên kho lưu trữ thất bại."));
    };
    xhr.send(file);
  });
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
  login: (payload, headers) =>
    request("/api/auth/login", { method: "POST", body: payload, headers }),
  register: (payload, headers) =>
    request("/api/auth/register", { method: "POST", body: payload, headers }),
  refresh: () => request("/api/auth/refresh", { method: "POST" }),
  logout: () => request("/api/auth/logout", { method: "POST" }),
  sendCode: (payload, headers) =>
    request("/api/auth/send-code", { method: "POST", body: payload, headers }),
  verifyCode: (payload) =>
    request("/api/auth/verify-code", { method: "POST", body: payload }),
  resetPassword: (payload) =>
    request("/api/auth/reset-password", { method: "POST", body: payload }),
  submitBanAppeal: (payload) =>
    request("/api/auth/ban-appeal", { method: "POST", body: payload }),
  sendReactivationCode: (payload) =>
    request("/api/auth/reactivation/send-code", { method: "POST", body: payload }),
  reactivateAccount: (payload) =>
    request("/api/auth/reactivation/confirm", { method: "POST", body: payload }),
  sendAccountDeactivationCode: (token, payload) =>
    request("/api/account/deactivation/send-code", { method: "POST", token, body: payload }),
  deactivateAccount: (token, payload) =>
    request("/api/account/deactivation", { method: "POST", token, body: payload }),
  sendAccountDeletionCode: (token, payload) =>
    request("/api/account/deletion/send-code", { method: "POST", token, body: payload }),
  deleteAccount: (token, payload) =>
    request("/api/account/deletion", { method: "POST", token, body: payload }),
  exchangeOAuthCode: (code) =>
    request("/api/auth/oauth/exchange", { method: "POST", body: { code } }),
  completeOnboarding: (payload, token) =>
    request("/api/auth/complete-onboarding", {
      method: "POST",
      token,
      body: payload,
    }),
  me: (token) =>
    request("/api/auth/me", token ? { token } : {}),
  wsTicket: (token) =>
    request("/api/auth/ws-ticket", token ? { token } : {}),
  updateMyProfile: (token, payload) =>
    request("/api/users/me", { method: "PUT", token, body: payload }),
  updatePrivacySettings: (token, payload) =>
    request("/api/users/me/privacy", { method: "PATCH", token, body: payload }),
  checkUsername: (username, { confirm = false } = {}) =>
    request(
      `/api/users/check-username${toQuery({ username, confirm: confirm || undefined })}`,
    ),
  checkEmail: (email, { confirm = false } = {}) =>
    request(
      `/api/users/check-email${toQuery({ email, confirm: confirm || undefined })}`,
    ),
  getPublicProfile: (username, token) =>
    request(
      `/api/users/${encodeURIComponent(username)}`,
      token ? { token } : {},
    ),
  getVideosByUsername: (username, { page = 0, size = 48, token } = {}) => {
    const u = String(username ?? "")
      .trim()
      .replace(/^@/, "");
    return request(
      `/api/users/${encodeURIComponent(u)}/videos${toQuery({ page, size })}`,
      token ? { token } : {},
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
  getForYouFeed: ({ size = 10, cursor, token } = {}) =>
    request(`/api/feed/for-you${toQuery({ size, cursor })}`, token ? { token } : {}),
  getStudioAnalyticsOverview: (token, { days = 7 } = {}) =>
    request(`/api/studio/analytics/overview${toQuery({ days })}`, { token }),
  getStudioVideoAnalytics: (token, publicId, { days = 7 } = {}) =>
    request(`/api/studio/analytics/video/${publicId}${toQuery({ days })}`, {
      token,
    }),
  getAdminUsers: (token, { page = 0, size = 20 } = {}) =>
    request(`/api/admin/users${toQuery({ page, size })}`, { token }),
  getAdminPosts: (token, { page = 0, size = 20, query, status } = {}) =>
    request(`/api/admin/posts${toQuery({ page, size, query, status })}`, { token }),
  getAdminPost: (token, publicId) =>
    request(`/api/admin/posts/${publicId}`, { token }),
  deleteAdminPost: (token, publicId) =>
    request(`/api/admin/posts/${publicId}`, { method: "DELETE", token }),
  createAdminUser: (token, payload) =>
    request("/api/admin/users", { method: "POST", token, body: payload }),
  updateAdminUser: (token, userId, payload) =>
    request(`/api/admin/users/${userId}`, { method: "PUT", token, body: payload }),
  deleteAdminUser: (token, userId) =>
    request(`/api/admin/users/${userId}`, { method: "DELETE", token }),
  getAdminBannedUsers: (token, { page = 0, size = 20 } = {}) =>
    request(`/api/admin/users/banned${toQuery({ page, size })}`, { token }),
  getAdminBanAppeals: (token, { page = 0, size = 20, status } = {}) =>
    request(`/api/admin/ban-appeals${toQuery({ page, size, status })}`, { token }),
  getAdminBanAppeal: (token, appealId) =>
    request(`/api/admin/ban-appeals/${appealId}`, { token }),
  updateAdminBanAppealStatus: (token, appealId, payload) =>
    request(`/api/admin/ban-appeals/${appealId}/status`, {
      method: "PATCH",
      token,
      body: payload,
    }),
  banAdminUser: (token, userId, payload) =>
    request(`/api/admin/users/${userId}/ban`, { method: "POST", token, body: payload }),
  unbanAdminUser: (token, userId) =>
    request(`/api/admin/users/${userId}/unban`, { method: "POST", token }),
  getAdminCuMappings: (token) =>
    request("/api/admin/content-understanding/category-tag-mappings", { token }),
  createAdminCuMapping: (token, payload) =>
    request("/api/admin/content-understanding/category-tag-mappings", {
      method: "POST",
      token,
      body: payload,
    }),
  updateAdminCuMapping: (token, id, payload) =>
    request(`/api/admin/content-understanding/category-tag-mappings/${id}`, {
      method: "PUT",
      token,
      body: payload,
    }),
  deleteAdminCuMapping: (token, id) =>
    request(`/api/admin/content-understanding/category-tag-mappings/${id}`, {
      method: "DELETE",
      token,
    }),
  getAdminCuCategories: (token) =>
    request("/api/admin/content-understanding/categories", { token }),
  getAdminCuSemanticTags: (token) =>
    request("/api/admin/content-understanding/semantic-tags", { token }),
  adminCuBackfill: (token, payload) =>
    request("/api/admin/content-understanding/backfill", {
      method: "POST",
      token,
      body: payload,
    }),
  adminCuReanalyze: (token, payload) =>
    request("/api/admin/content-understanding/reanalyze", {
      method: "POST",
      token,
      body: payload,
    }),
  getAdminCuJobs: (token, { page = 0, size = 20, status } = {}) =>
    request(`/api/admin/content-understanding/jobs${toQuery({ page, size, status })}`, {
      token,
    }),
  getFollowingFeed: (token, { page = 0, size = 10 } = {}) =>
    request(`/api/feed/following${toQuery({ page, size })}`, { token }),
  createVideo: (payload, token) =>
    request("/api/videos", { method: "POST", body: payload, token }),
  getVideoOriginality: (publicId, token) =>
    request(`/api/videos/${encodeURIComponent(publicId)}/originality`, { token }),
  getVideo: (publicId, { token } = {}) =>
    request(`/api/videos/${publicId}`, token ? { token } : {}),
  getVideosBySound: (audioUrl, { page = 0, size = 24 } = {}) =>
    request(`/api/videos/sound${toQuery({ audioUrl, page, size })}`),
  getVideosByHashtag: (tag, { page = 0, size = 24 } = {}) =>
    request(`/api/videos/hashtag${toQuery({ tag, page, size })}`),
  getExploreCategories: () => request("/api/explore/categories"),
  getExploreTabs: ({ token } = {}) =>
    request("/api/explore/tabs", token ? { token } : {}),
  getExploreTrending: ({ cursor, size = 24 } = {}) =>
    request(`/api/explore/trending${toQuery({ cursor, size })}`),
  getExploreForYou: ({ cursor, size = 24, token } = {}) =>
    request(`/api/explore/for-you${toQuery({ cursor, size })}`, token ? { token } : {}),
  getExploreCategory: (slug, { cursor, size = 24 } = {}) =>
    request(`/api/explore/category/${encodeURIComponent(slug)}${toQuery({ cursor, size })}`),
  getExploreTopic: (slug, { cursor, size = 24 } = {}) =>
    request(`/api/explore/topic/${encodeURIComponent(slug)}${toQuery({ cursor, size })}`),
  searchExplore: (q, { cursor, size = 24 } = {}) =>
    request(`/api/explore/search${toQuery({ q, cursor, size })}`),
  getSearchSuggest: (q, { token } = {}) =>
    request(`/api/search/suggest${toQuery({ q: q ?? "" })}`, token ? { token } : {}),
  getSearchUsers: (q, { limit = 20 } = {}) =>
    request(`/api/search/users${toQuery({ q, limit })}`),
  getSearchVideos: (q, { limit = 20 } = {}) =>
    request(`/api/search/videos${toQuery({ q, limit })}`),
  getSearchHashtags: (q, { limit = 20 } = {}) =>
    request(`/api/search/hashtags${toQuery({ q, limit })}`),
  getSearchTrending: ({ limit = 20 } = {}) =>
    request(`/api/search/trending${toQuery({ limit })}`),
  getSearchHistory: (token, { limit = 30 } = {}) =>
    request(`/api/search/history${toQuery({ limit })}`, { token }),
  recordSearchHistory: (token, query) =>
    request("/api/search/history", {
      method: "POST",
      token,
      body: { query },
    }),
  clearSearchHistory: (token) =>
    request("/api/search/history", { method: "DELETE", token }),
  deleteSearchHistoryItem: (token, id) =>
    request(`/api/search/history/${encodeURIComponent(String(id))}`, {
      method: "DELETE",
      token,
    }),
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
  repostVideo: (publicId, token) =>
    request(`/api/videos/${publicId}/reposts`, { method: "POST", token }),
  unrepostVideo: (publicId, token) =>
    request(`/api/videos/${publicId}/reposts`, { method: "DELETE", token }),
  getVideoMeState: (publicId, token) =>
    request(`/api/videos/${publicId}/me`, { token }),
  getMyLikedVideos: (token, { page = 0, size = 24 } = {}) =>
    request(`/api/users/me/liked-videos${toQuery({ page, size })}`, { token }),
  getMyBookmarkedVideos: (token, { page = 0, size = 24 } = {}) =>
    request(`/api/users/me/bookmarked-videos${toQuery({ page, size })}`, {
      token,
    }),
  getMyRepostedVideos: (token, { page = 0, size = 24 } = {}) =>
    request(`/api/users/me/reposted-videos${toQuery({ page, size })}`, {
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
  likeComment: (publicId, commentId, token) =>
    request(`/api/videos/${publicId}/comments/${commentId}/likes`, {
      method: "POST",
      token,
    }),
  unlikeComment: (publicId, commentId, token) =>
    request(`/api/videos/${publicId}/comments/${commentId}/likes`, {
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
  acceptFollowRequest: (userId, token) =>
    request(`/api/follows/requests/${userId}/accept`, { method: "POST", token }),
  rejectFollowRequest: (userId, token) =>
    request(`/api/follows/requests/${userId}/reject`, { method: "POST", token }),
  getMentionableFriends: (token) => request("/api/follows/friends", { token }),
  recordVideoView: (publicId, body, { token } = {}) =>
    request(`/api/videos/${publicId}/views`, { method: "POST", body, ...(token ? { token } : {}) }),
  recordVideoShare: (publicId, { token } = {}) =>
    request(`/api/videos/${publicId}/shares`, { method: "POST", ...(token ? { token } : {}) }),
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
  getNotifications: (token, { filter = "all", cursor, size = 20 } = {}) =>
    request(
      `/api/notifications${toQuery({
        filter: filter && filter !== "all" ? filter : undefined,
        cursor,
        size,
      })}`,
      { token },
    ),
  getSystemNotifications: (token, { filter = "all", cursor, size = 20 } = {}) =>
    request(
      `/api/notifications/system${toQuery({
        filter: filter && filter !== "all" ? filter : undefined,
        cursor,
        size,
      })}`,
      { token },
    ),
  getNotificationUnreadCount: (token) =>
    request("/api/notifications/unread-count", { token }),
  markNotificationRead: (notificationId, token) =>
    request(`/api/notifications/${notificationId}/read`, {
      method: "POST",
      token,
    }),
  markNotificationsRead: (ids, token) =>
    request("/api/notifications/read", {
      method: "POST",
      body: { ids },
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
