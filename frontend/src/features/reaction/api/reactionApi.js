import { request } from "@/shared/api/http.js";

export const reactionApi = {
  likeVideo: (publicId, token) =>
    request(`/api/videos/${publicId}/likes`, { method: "POST", token }),
  unlikeVideo: (publicId, token) =>
    request(`/api/videos/${publicId}/likes`, { method: "DELETE", token }),
  repostVideo: (publicId, token) =>
    request(`/api/videos/${publicId}/reposts`, { method: "POST", token }),
  unrepostVideo: (publicId, token) =>
    request(`/api/videos/${publicId}/reposts`, { method: "DELETE", token }),
};
