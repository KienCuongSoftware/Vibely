import { request, toQuery } from "@/shared/api/http.js";

export const authApi = {
  login: (payload, headers) =>
    request("/api/auth/login", { method: "POST", body: payload, headers }),
  register: (payload, headers) =>
    request("/api/auth/register", { method: "POST", body: payload, headers }),
  refresh: () => request("/api/auth/refresh", { method: "POST" }),
  logout: () => request("/api/auth/logout", { method: "POST" }),
  sendCode: (payload, headers) =>
    request("/api/auth/send-code", { method: "POST", body: payload, headers }),
  verifyCode: (payload) =>
    request("/api/auth/verify-code", { method: "POST", body: payload }),
  resetPassword: (payload) =>
    request("/api/auth/reset-password", { method: "POST", body: payload }),
  submitBanAppeal: (payload) =>
    request("/api/auth/ban-appeal", { method: "POST", body: payload }),
  sendReactivationCode: (payload) =>
    request("/api/auth/reactivation/send-code", { method: "POST", body: payload }),
  reactivateAccount: (payload) =>
    request("/api/auth/reactivation/confirm", { method: "POST", body: payload }),
  sendAccountDeactivationCode: (token, payload) =>
    request("/api/account/deactivation/send-code", { method: "POST", token, body: payload }),
  deactivateAccount: (token, payload) =>
    request("/api/account/deactivation", { method: "POST", token, body: payload }),
  sendAccountDeletionCode: (token, payload) =>
    request("/api/account/deletion/send-code", { method: "POST", token, body: payload }),
  deleteAccount: (token, payload) =>
    request("/api/account/deletion", { method: "POST", token, body: payload }),
  exchangeOAuthCode: (code) =>
    request("/api/auth/oauth/exchange", { method: "POST", body: { code } }),
  completeOnboarding: (payload, token) =>
    request("/api/auth/complete-onboarding", {
      method: "POST",
      token,
      body: payload,
    }),
  me: (token) => request("/api/auth/me", token ? { token } : {}),
  wsTicket: (token) => request("/api/auth/ws-ticket", token ? { token } : {}),
};
