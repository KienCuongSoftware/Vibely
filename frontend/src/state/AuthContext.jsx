import React from "react";
import { useEffect, useState } from "react";
import { apiClient } from "../api/client";
import { onAccountBanned } from "../auth/accountBanBridge.js";
import { COOKIE_SESSION_MARKER } from "../auth/session.js";
import { isPendingOAuthBrowserCallback } from "../auth/oauthCallback.js";
import { collectLoginContext } from "../security/loginContext.js";
import { DEFAULT_AVATAR_URL, sanitizeAvatarUrl } from "../utils/avatarUrl.js";
import { AuthContext } from "./auth-context";

const USER_CACHE_KEY = "vibely_user_cache";
const LEGACY_TOKEN_KEY = "vibely_token";
const LEGACY_REFRESH_TOKEN_KEY = "vibely_refresh_token";

function persistUserCache(meLike) {
  try {
    if (!meLike || typeof meLike !== "object") return;
    localStorage.setItem(USER_CACHE_KEY, JSON.stringify(meLike));
  } catch {
    // ignore quota / private mode
  }
}

function readCachedUserPayload() {
  try {
    const raw = localStorage.getItem(USER_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return typeof parsed === "object" && parsed !== null ? parsed : null;
  } catch {
    return null;
  }
}

function clearLegacyTokenStorage() {
  try {
    localStorage.removeItem(LEGACY_TOKEN_KEY);
    localStorage.removeItem(LEGACY_REFRESH_TOKEN_KEY);
  } catch {
    // ignore
  }
}

function isBlank(value) {
  return value === null || value === undefined || String(value).trim() === "";
}

function normalizeVibelyId(raw) {
  if (isBlank(raw)) return "";
  return String(raw).trim().replace(/^@/, "").toLowerCase();
}

function deriveVibelyIdFromEmail(email) {
  if (isBlank(email)) return "vibely.user";
  const localPart = String(email).trim().split("@")[0] ?? "";
  const withoutDiacritics = localPart
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "");

  let base = withoutDiacritics.toLowerCase().replace(/[^a-z0-9]/g, "");
  if (base.length < 4) base = (base + "user").slice(0, 4);
  if (base.length > 24) base = base.slice(0, 24);
  return base || "vibely.user";
}

function mapUserWithDefaultAvatar(userLike) {
  const normalizedUsername = normalizeVibelyId(userLike?.username);
  const username =
    normalizedUsername ||
    (userLike?.email ? deriveVibelyIdFromEmail(userLike.email) : "");

  const avatarUrl = sanitizeAvatarUrl(userLike?.avatarUrl, DEFAULT_AVATAR_URL);

  return {
    ...userLike,
    username,
    avatarUrl,
    role: userLike?.role,
  };
}

function isUnauthorizedError(err) {
  if (err?.status === 401 || err?.code === "AUTH_REQUIRED") return true;
  const msg = String(err?.message ?? "");
  return (
    msg.includes("401") ||
    msg.includes("AUTH_REQUIRED") ||
    msg.includes("đăng nhập")
  );
}

function mapAuthSessionToUser(result) {
  return mapUserWithDefaultAvatar({
    id: result.userId,
    username: result.username,
    displayName: result.displayName,
    email: result.email,
    role: result.role,
    avatarUrl: result.avatarUrl,
    needsOnboarding: Boolean(result.needsOnboarding),
  });
}

function persistSessionUser(result) {
  persistUserCache({
    id: result.userId,
    username: result.username,
    displayName: result.displayName,
    email: result.email,
    role: result.role,
    bio: null,
    avatarUrl: mapAuthSessionToUser(result).avatarUrl,
    needsOnboarding: Boolean(result.needsOnboarding),
  });
}

export function AuthProvider({ children }) {
  const [token, setToken] = useState(null);
  const [user, setUser] = useState(null);
  const [authReady, setAuthReady] = useState(false);

  useEffect(() => {
    clearLegacyTokenStorage();
  }, []);

  useEffect(() => {
    // Clear cookies/session; pages (Upload/Login) show the ban modal with reason.
    return onAccountBanned(() => {
      apiClient.logout().catch(() => {});
      localStorage.removeItem(USER_CACHE_KEY);
      setToken(null);
      setUser(null);
      setAuthReady(true);
    });
  }, []);

  const establishSession = (result) => {
    const mapped = mapAuthSessionToUser(result);
    setUser(mapped);
    setToken(COOKIE_SESSION_MARKER);
    persistSessionUser(result);
    return result;
  };

  const login = async (email, password, headers) => {
    const loginContext = await collectLoginContext();
    const result = await apiClient.login({ email, password, loginContext }, headers);
    return establishSession(result);
  };

  const reactivateAccount = async (payload) => {
    const result = await apiClient.reactivateAccount(payload);
    return establishSession(result);
  };

  const register = async (payload, headers) => {
    const result = await apiClient.register(payload, headers);
    return establishSession(result);
  };

  const refreshSession = async () => {
    const result = await apiClient.refresh();
    if (!result) {
      clearSession();
      return null;
    }
    return establishSession(result);
  };

  const resolveSessionProfile = async () => {
    let me = await apiClient.me(COOKIE_SESSION_MARKER);
    if (!me) {
      const refreshed = await apiClient.refresh();
      if (refreshed) {
        me = await apiClient.me(COOKIE_SESSION_MARKER);
      }
    }
    return me ?? null;
  };

  const refreshProfile = async () => {
    if (!token) return null;
    try {
      const me = await resolveSessionProfile();
      if (!me) {
        clearSession();
        return null;
      }
      persistUserCache(me);
      setUser(mapUserWithDefaultAvatar(me));
      setToken(COOKIE_SESSION_MARKER);
      return me;
    } catch (e) {
      if (isUnauthorizedError(e)) {
        clearSession();
        return null;
      }
      throw e;
    }
  };

  const updateProfile = async (payload) => {
    if (!token) {
      throw new Error("Bạn cần đăng nhập để cập nhật hồ sơ");
    }
    await apiClient.updateMyProfile(COOKIE_SESSION_MARKER, payload);
    return refreshProfile();
  };

  const completeOAuthLogin = (payload) => {
    establishSession({
      userId: payload.userId,
      username: payload.username,
      displayName: payload.displayName,
      email: payload.email,
      role: payload.role,
      avatarUrl: payload.avatarUrl,
      needsOnboarding: Boolean(payload.needsOnboarding),
    });
  };

  const logout = () => {
    apiClient.logout().catch(() => {});
    clearSession();
    setAuthReady(true);
  };

  const clearSession = () => {
    localStorage.removeItem(USER_CACHE_KEY);
    setToken(null);
    setUser(null);
  };

  useEffect(() => {
    let cancelled = false;

    const bootstrap = async () => {
      setAuthReady(false);

      // LoginPage exchanges the one-time code and sets httpOnly cookies — avoid
      // racing bootstrap /me (401) and clearSession() wiping a fresh OAuth login.
      if (isPendingOAuthBrowserCallback()) {
        if (!cancelled) {
          setAuthReady(true);
        }
        return;
      }

      try {
        let me = await apiClient.me();
        if (!me) {
          const refreshed = await apiClient.refresh();
          if (refreshed) {
            me = await apiClient.me();
          }
        }
        if (cancelled) return;
        if (!me) {
          clearSession();
        } else {
          persistUserCache(me);
          setUser(mapUserWithDefaultAvatar(me));
          setToken(COOKIE_SESSION_MARKER);
        }
      } catch {
        if (cancelled) return;
        clearSession();
      } finally {
        if (!cancelled) {
          setAuthReady(true);
        }
      }
    };

    void bootstrap();

    return () => {
      cancelled = true;
    };
  }, []);

  const value = {
    token,
    user,
    authReady,
    login,
    register,
    reactivateAccount,
    refreshSession,
    refreshProfile,
    updateProfile,
    completeOAuthLogin,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
