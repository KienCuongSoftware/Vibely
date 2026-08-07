import { request, toQuery } from "@/shared/api/http.js";

function normalizeUsername(username) {
  return String(username ?? "")
    .trim()
    .replace(/^@/, "");
}

export const profileApi = {
  updateMyProfile: (token, payload) =>
    request("/api/users/me", { method: "PUT", token, body: payload }),
  getPublicProfile: (username, token) =>
    request(
      `/api/users/${encodeURIComponent(username)}`,
      token ? { token } : {},
    ),
  recordProfileView: (username, { token, viewerKey } = {}) =>
    request(`/api/users/${encodeURIComponent(normalizeUsername(username))}/profile-views`, {
      method: "POST",
      token,
      body: viewerKey ? { viewerKey } : {},
    }),
  getVideosByUsername: (username, { page = 0, size = 48, token } = {}) => {
    const u = normalizeUsername(username);
    return request(
      `/api/users/${encodeURIComponent(u)}/videos${toQuery({ page, size })}`,
      token ? { token } : {},
    );
  },
  getProfileFollowing: (username, { page = 0, size = 20, token } = {}) => {
    const u = normalizeUsername(username);
    return request(
      `/api/users/${encodeURIComponent(u)}/following${toQuery({ page, size })}`,
      token ? { token } : {},
    );
  },
  getProfileFollowers: (username, { page = 0, size = 20, token } = {}) => {
    const u = normalizeUsername(username);
    return request(
      `/api/users/${encodeURIComponent(u)}/followers${toQuery({ page, size })}`,
      token ? { token } : {},
    );
  },
  getSuggestedCreators: (token, { page = 0, size = 24 } = {}) =>
    request(`/api/users/me/suggested-creators${toQuery({ page, size })}`, { token }),
  getMyLikedVideos: (token, { page = 0, size = 24 } = {}) =>
    request(`/api/users/me/liked-videos${toQuery({ page, size })}`, { token }),
  getMyBookmarkedVideos: (token, { page = 0, size = 24 } = {}) =>
    request(`/api/users/me/bookmarked-videos${toQuery({ page, size })}`, { token }),
  getMyRepostedVideos: (token, { page = 0, size = 24 } = {}) =>
    request(`/api/users/me/reposted-videos${toQuery({ page, size })}`, { token }),
  getMyUploadedVideos: (token, { page = 0, size = 24 } = {}) =>
    request(`/api/users/me/videos${toQuery({ page, size })}`, { token }),
};
