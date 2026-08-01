import { request, toQuery } from "@/shared/api/http.js";

export const notificationApi = {
  getNotifications: (token, { filter = "all", cursor, size = 20 } = {}) =>
    request(
      `/api/notifications${toQuery({
        filter: filter && filter !== "all" ? filter : undefined,
        cursor,
        size,
      })}`,
      { token },
    ),
  getSystemNotifications: (token, { filter = "all", cursor, size = 20 } = {}) =>
    request(
      `/api/notifications/system${toQuery({
        filter: filter && filter !== "all" ? filter : undefined,
        cursor,
        size,
      })}`,
      { token },
    ),
  getNotificationUnreadCount: (token) =>
    request("/api/notifications/unread-count", { token }),
  markNotificationRead: (notificationId, token) =>
    request(`/api/notifications/${notificationId}/read`, {
      method: "POST",
      token,
    }),
  markNotificationsRead: (ids, token) =>
    request("/api/notifications/read", {
      method: "POST",
      body: { ids },
      token,
    }),
};
