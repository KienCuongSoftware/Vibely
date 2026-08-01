import { request, toQuery } from "@/shared/api/http.js";

export const feedApi = {
  getFeed: ({ size = 10, sort = "latest", cursor, token } = {}) =>
    request(`/api/feed${toQuery({ size, sort, cursor })}`, token ? { token } : {}),
  getForYouFeed: ({ size = 10, cursor, token } = {}) =>
    request(`/api/feed/for-you${toQuery({ size, cursor })}`, token ? { token } : {}),
  getFollowingFeed: (token, { page = 0, size = 10 } = {}) =>
    request(`/api/feed/following${toQuery({ page, size })}`, { token }),
};
