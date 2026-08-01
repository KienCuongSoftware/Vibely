import { request, toQuery } from "@/shared/api/http.js";

export const settingsApi = {
  updatePrivacySettings: (token, payload) =>
    request("/api/users/me/privacy", { method: "PATCH", token, body: payload }),
  updateAccountRegion: (token, payload) =>
    request("/api/users/me/account-region", { method: "PATCH", token, body: payload }),
  listDataExports: (token) =>
    request("/api/users/me/data-exports", { token }),
  createDataExport: (token, payload) =>
    request("/api/users/me/data-exports", { method: "POST", token, body: payload }),
  cancelDataExport: (token, requestId) =>
    request(`/api/users/me/data-exports/${requestId}`, { method: "DELETE", token }),
};
