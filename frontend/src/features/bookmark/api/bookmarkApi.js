import { request } from "@/shared/api/http.js";

export const bookmarkApi = {
  bookmarkVideo: (publicId, token) =>
    request(`/api/videos/${publicId}/bookmarks`, { method: "POST", token }),
  unbookmarkVideo: (publicId, token) =>
    request(`/api/videos/${publicId}/bookmarks`, { method: "DELETE", token }),
};
