import { request, toQuery } from "@/shared/api/http.js";

export const adminApi = {
  getAdminUsers: (token, { page = 0, size = 20 } = {}) =>
    request(`/api/admin/users${toQuery({ page, size })}`, { token }),
  getAdminPosts: (token, { page = 0, size = 20, query, status } = {}) =>
    request(`/api/admin/posts${toQuery({ page, size, query, status })}`, { token }),
  getAdminPost: (token, publicId) =>
    request(`/api/admin/posts/${publicId}`, { token }),
  adminCuReanalyze: (token, payload) =>
    request("/api/admin/content-understanding/reanalyze", {
      method: "POST",
      token,
      body: payload,
    }),
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
  getAdminModerationQueue: (token, { page = 0, size = 20, state, source } = {}) =>
    request(`/api/admin/moderation/queue${toQuery({ page, size, state, source })}`, { token }),
  getAdminModerationVideo: (token, publicId) =>
    request(`/api/admin/moderation/videos/${encodeURIComponent(publicId)}`, { token }),
  claimAdminModerationQueue: (token, queueId) =>
    request(`/api/admin/moderation/queue/${queueId}/claim`, { method: "POST", token }),
  resolveAdminModerationQueue: (token, queueId, payload) =>
    request(`/api/admin/moderation/queue/${queueId}/resolve`, {
      method: "POST",
      token,
      body: payload,
    }),
  getAdminModerationAppeals: (token, { page = 0, size = 20, state } = {}) =>
    request(`/api/admin/moderation/appeals${toQuery({ page, size, state })}`, { token }),
  resolveAdminModerationAppeal: (token, appealId, payload) =>
    request(`/api/admin/moderation/appeals/${appealId}/resolve`, {
      method: "POST",
      token,
      body: payload,
    }),
  banAdminUser: (token, userId, payload) =>
    request(`/api/admin/users/${userId}/ban`, { method: "POST", token, body: payload }),
  unbanAdminUser: (token, userId) =>
    request(`/api/admin/users/${userId}/unban`, { method: "POST", token }),
  adminReprocessVideoHls: (token, publicIds) =>
    request("/api/admin/video-processing/reprocess", {
      method: "POST",
      token,
      body: { publicIds },
    }),
  adminBackfillVideoHls: (token, limit = 50) =>
    request("/api/admin/video-processing/backfill-hls", {
      method: "POST",
      token,
      body: { limit },
    }),
};
