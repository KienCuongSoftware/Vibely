import { request, toQuery } from "@/shared/api/http.js";

export const searchApi = {
  getSearchSuggest: (q, { token } = {}) =>
    request(`/api/search/suggest${toQuery({ q: q ?? "" })}`, token ? { token } : {}),
  getSearchUsers: (q, { limit = 20 } = {}) =>
    request(`/api/search/users${toQuery({ q, limit })}`),
  getSearchVideos: (q, { limit = 20 } = {}) =>
    request(`/api/search/videos${toQuery({ q, limit })}`),
  getSearchSemantic: (q, { limit = 20 } = {}) =>
    request(`/api/search/semantic${toQuery({ q, limit })}`),
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
};
