import { request, toQuery } from "@/shared/api/http.js";

export const postApi = {
  createVideo: (payload, token) =>
    request("/api/videos", { method: "POST", body: payload, token }),
  getVideoOriginality: (publicId, token) =>
    request(`/api/videos/${encodeURIComponent(publicId)}/originality`, { token }),
  getVideo: (publicId, { token } = {}) =>
    request(`/api/videos/${publicId}`, token ? { token } : {}),
  getVideosBySound: (audioUrl, { page = 0, size = 24 } = {}) =>
    request(`/api/videos/sound${toQuery({ audioUrl, page, size })}`),
  browseSounds: (q, { page = 0, size = 20 } = {}) =>
    request(`/api/videos/sounds${toQuery({ q: q || undefined, page, size })}`),
  getVideosByHashtag: (tag, { page = 0, size = 24 } = {}) =>
    request(`/api/videos/hashtag${toQuery({ tag, page, size })}`),
  getVideoAnalysis: (publicId, token) =>
    request(`/api/videos/${encodeURIComponent(publicId)}/analysis`, token ? { token } : {}),
  getVideoSemanticTags: (publicId, token) =>
    request(`/api/videos/${encodeURIComponent(publicId)}/semantic-tags`, token ? { token } : {}),
  getVideoCuTopics: (publicId, token) =>
    request(`/api/videos/${encodeURIComponent(publicId)}/topics`, token ? { token } : {}),
  getVideoCuCategories: (publicId, token) =>
    request(`/api/videos/${encodeURIComponent(publicId)}/categories`, token ? { token } : {}),
  updateVideo: (publicId, payload, token) =>
    request(`/api/videos/${publicId}`, { method: "PUT", body: payload, token }),
  deleteVideo: (publicId, token) =>
    request(`/api/videos/${publicId}`, { method: "DELETE", token }),
  retryVideoProcessing: (publicId, token) =>
    request(`/api/videos/${encodeURIComponent(publicId)}/retry-processing`, {
      method: "POST",
      token,
    }),
  getVideoMeState: (publicId, token) =>
    request(`/api/videos/${publicId}/me`, { token }),
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
  requestDescriptionTranslation: (publicId, targetLang, token) =>
    request(
      `/api/videos/${encodeURIComponent(publicId)}/description-translation${toQuery({
        targetLang,
        request: true,
      })}`,
      token ? { token } : {},
    ),
  getDescriptionTranslation: (publicId, targetLang, token) =>
    request(
      `/api/videos/${encodeURIComponent(publicId)}/description-translation${toQuery({
        targetLang,
      })}`,
      token ? { token } : {},
    ),
};
