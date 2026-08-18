import { request, toQuery } from "@/shared/api/http.js";

export const studioApi = {
  getStudioAnalyticsOverview: (token, { days = 7 } = {}) =>
    request(`/api/studio/analytics/overview${toQuery({ days })}`, { token }),
  getStudioChannelAnalytics: (token, { days = 7 } = {}) =>
    request(`/api/studio/analytics/channel${toQuery({ days })}`, { token }),
  getStudioVideoAnalytics: (token, publicId, { days = 7 } = {}) =>
    request(`/api/studio/analytics/video/${publicId}${toQuery({ days })}`, {
      token,
    }),
  getStudioComments: (
    token,
    {
      page = 0,
      size = 20,
      query = "",
      postedBy = "all",
      replyStatus = "all",
      followerBands = "",
      from = "",
      to = "",
      sort = "latest",
    } = {},
  ) =>
    request(
      `/api/studio/comments${toQuery({
        page,
        size,
        query,
        postedBy,
        replyStatus,
        followerBands,
        from,
        to,
        sort,
      })}`,
      { token },
    ),
  getStudioInspirationCategories: (token) =>
    request("/api/studio/inspiration/categories", { token }),
  getStudioInspirationTrending: (
    token,
    { kind = "posts", category = "all", region = "all", page = 0, size = 20 } = {},
  ) =>
    request(
      `/api/studio/inspiration/trending${toQuery({ kind, category, region, page, size })}`,
      { token },
    ),
  getStudioInspirationRecommended: (
    token,
    { kind = "similar_posts", page = 0, size = 20 } = {},
  ) =>
    request(
      `/api/studio/inspiration/recommended${toQuery({ kind, page, size })}`,
      { token },
    ),
  getStudioInspirationSaved: (token, { page = 0, size = 20 } = {}) =>
    request(`/api/studio/inspiration/saved${toQuery({ page, size })}`, { token }),
  saveStudioInspiration: (token, publicId) =>
    request(`/api/studio/inspiration/saved/${encodeURIComponent(publicId)}`, {
      method: "POST",
      token,
    }),
  unsaveStudioInspiration: (token, publicId) =>
    request(`/api/studio/inspiration/saved/${encodeURIComponent(publicId)}`, {
      method: "DELETE",
      token,
    }),
};
