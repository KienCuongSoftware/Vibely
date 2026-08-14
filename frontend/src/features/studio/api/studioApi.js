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
};
