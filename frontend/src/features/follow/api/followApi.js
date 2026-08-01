import { request } from "@/shared/api/http.js";

export const followApi = {
  follow: (userId, token) =>
    request(`/api/follows/${userId}`, { method: "POST", token }),
  unfollow: (userId, token) =>
    request(`/api/follows/${userId}`, { method: "DELETE", token }),
  acceptFollowRequest: (userId, token) =>
    request(`/api/follows/requests/${userId}/accept`, { method: "POST", token }),
  rejectFollowRequest: (userId, token) =>
    request(`/api/follows/requests/${userId}/reject`, { method: "POST", token }),
  getMentionableFriends: (token) => request("/api/follows/friends", { token }),
};
