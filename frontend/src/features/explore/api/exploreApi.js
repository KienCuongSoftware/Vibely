import { request, toQuery } from "@/shared/api/http.js";

export const exploreApi = {
  getExploreCategories: () => request("/api/explore/categories"),
  getExploreTabs: ({ token } = {}) =>
    request("/api/explore/tabs", token ? { token } : {}),
  getExploreTrending: ({ cursor, size = 24 } = {}) =>
    request(`/api/explore/trending${toQuery({ cursor, size })}`),
  getExploreTrendingTags: ({ windowDays = 7, limit = 20 } = {}) =>
    request(`/api/explore/trending-tags${toQuery({ windowDays, limit })}`),
  getExploreForYou: ({ cursor, size = 24, token } = {}) =>
    request(`/api/explore/for-you${toQuery({ cursor, size })}`, token ? { token } : {}),
  getExploreCategory: (slug, { cursor, size = 24 } = {}) =>
    request(`/api/explore/category/${encodeURIComponent(slug)}${toQuery({ cursor, size })}`),
  getExploreTopic: (slug, { cursor, size = 24 } = {}) =>
    request(`/api/explore/topic/${encodeURIComponent(slug)}${toQuery({ cursor, size })}`),
  searchExplore: (q, { cursor, size = 24 } = {}) =>
    request(`/api/explore/search${toQuery({ q, cursor, size })}`),
  getExploreRelated: (publicId, { size = 18 } = {}) =>
    request(`/api/explore/video/${encodeURIComponent(publicId)}/related${toQuery({ size })}`),
};
