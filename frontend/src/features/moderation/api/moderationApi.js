import { request } from "@/shared/api/http.js";

export const moderationApi = {
  getVideoModerationStatus: (token, publicId) =>
    request(`/api/videos/${encodeURIComponent(publicId)}/moderation-status`, { token }),
  createVideoModerationAppeal: (token, publicId, payload) =>
    request(`/api/videos/${encodeURIComponent(publicId)}/moderation-appeals`, {
      method: "POST",
      token,
      body: payload,
    }),
};
