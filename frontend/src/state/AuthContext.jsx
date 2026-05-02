import React from "react";
import { useEffect, useState } from "react";
import { apiClient } from "../api/client";
import { AuthContext } from "./auth-context";

const TOKEN_KEY = "vibely_token";
const REFRESH_TOKEN_KEY = "vibely_refresh_token";
const USER_CACHE_KEY = "vibely_user_cache";
const DEFAULT_AVATAR_URL = "/images/users/default-avatar.jpeg";

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

function isBlank(value) {
  return value === null || value === undefined || String(value).trim() === "";
}

function decodeJwtSubject(token) {
  try {
    if (isBlank(token)) return "";
    const parts = String(token).split(".");
    if (parts.length < 2) return "";
    // JWT payload is base64url encoded
    const payload = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const padded = payload.padEnd(
      payload.length + ((4 - (payload.length % 4)) % 4),
      "=",
    );
    const json = atob(padded);
    const data = JSON.parse(json);
    // We use `subject` in backend to store email
    return data?.sub ?? data?.subject ?? "";
  } catch {
    return "";
  }
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

  // Only keep a-z0-9 (matches backend expectation for Google ID spec you requested)
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

  const avatarUrl = isBlank(userLike?.avatarUrl)
    ? DEFAULT_AVATAR_URL
    : userLike.avatarUrl;

  return {
    ...userLike,
    username,
    avatarUrl,
  };
}

export function AuthProvider({ children }) {
  const [token, setToken] = useState(localStorage.getItem(TOKEN_KEY));
  const [refreshToken, setRefreshToken] = useState(
    localStorage.getItem(REFRESH_TOKEN_KEY),
  );
  const [user, setUser] = useState(null);

  const login = async (email, password) => {
    const result = await apiClient.login({ email, password });
    localStorage.setItem(TOKEN_KEY, result.accessToken);
    localStorage.setItem(REFRESH_TOKEN_KEY, result.refreshToken);
    setToken(result.accessToken);
    setRefreshToken(result.refreshToken);
    const mapped = mapUserWithDefaultAvatar({
      id: result.userId,
      username: result.username,
      displayName: result.displayName,
      email: result.email,
      avatarUrl: result.avatarUrl,
    });
    setUser(mapped);
    persistUserCache({
      id: result.userId,
      username: result.username,
      displayName: result.displayName,
      email: result.email,
      bio: null,
      avatarUrl: mapped.avatarUrl,
    });
    return result;
  };

  const register = async (payload) => {
    const result = await apiClient.register(payload);
    localStorage.setItem(TOKEN_KEY, result.accessToken);
    localStorage.setItem(REFRESH_TOKEN_KEY, result.refreshToken);
    setToken(result.accessToken);
    setRefreshToken(result.refreshToken);
    const mapped = mapUserWithDefaultAvatar({
      id: result.userId,
      username: result.username,
      displayName: result.displayName,
      email: result.email,
      avatarUrl: result.avatarUrl,
    });
    setUser(mapped);
    persistUserCache({
      id: result.userId,
      username: result.username,
      displayName: result.displayName,
      email: result.email,
      bio: null,
      avatarUrl: mapped.avatarUrl,
    });
    return result;
  };

  const refreshSession = async () => {
    if (!refreshToken) return null;
    const result = await apiClient.refresh(refreshToken);
    localStorage.setItem(TOKEN_KEY, result.accessToken);
    localStorage.setItem(REFRESH_TOKEN_KEY, result.refreshToken);
    setToken(result.accessToken);
    setRefreshToken(result.refreshToken);
    return result;
  };

  const refreshProfile = async () => {
    if (!token) return null;
    const me = await apiClient.me(token);
    const emailFromToken = decodeJwtSubject(token);
    const fixedMe = {
      ...me,
      email: isBlank(me?.email) ? emailFromToken : me?.email,
    };
    persistUserCache(fixedMe);
    setUser(mapUserWithDefaultAvatar(fixedMe));
    return me;
  };

  const updateProfile = async (payload) => {
    if (!token) {
      throw new Error("Bạn cần đăng nhập để cập nhật hồ sơ");
    }
    await apiClient.updateMyProfile(token, payload);
    return refreshProfile();
  };

  const completeOAuthLogin = (payload) => {
    localStorage.setItem(TOKEN_KEY, payload.accessToken);
    localStorage.setItem(REFRESH_TOKEN_KEY, payload.refreshToken);
    setToken(payload.accessToken);
    setRefreshToken(payload.refreshToken);

    const emailFromToken = decodeJwtSubject(payload.accessToken);
    const mapped = mapUserWithDefaultAvatar({
      id: payload.userId,
      username: payload.username,
      displayName: payload.displayName,
      email: isBlank(payload.email) ? emailFromToken : payload.email,
      avatarUrl: payload.avatarUrl,
    });
    setUser(mapped);
    persistUserCache({
      id: payload.userId,
      username: payload.username,
      displayName: payload.displayName,
      email: mapped.email,
      bio: null,
      avatarUrl: mapped.avatarUrl,
    });
  };

  const logout = () => {
    if (refreshToken) {
      apiClient.logout(refreshToken).catch(() => {});
    }
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
    localStorage.removeItem(USER_CACHE_KEY);
    setToken(null);
    setRefreshToken(null);
    setUser(null);
  };

  // Luôn đồng bộ `/api/auth/me` khi có token; lỗi mạng/server thì fallback cache (avatar sidebar).
  useEffect(() => {
    if (!token) {
      setUser(null);
      localStorage.removeItem(USER_CACHE_KEY);
      return;
    }

    const cachedBootstrap = readCachedUserPayload();
    if (cachedBootstrap) {
      const emailFromToken = decodeJwtSubject(token);
      const fixedCachedBootstrap = {
        ...cachedBootstrap,
        email: isBlank(cachedBootstrap.email)
          ? emailFromToken
          : cachedBootstrap.email,
      };
      setUser(mapUserWithDefaultAvatar(fixedCachedBootstrap));
    }

    let cancelled = false;

    const applyMePayload = (me, accessToken) => {
      const emailFromToken = decodeJwtSubject(accessToken);
      const fixedMe = {
        ...me,
        email: isBlank(me?.email) ? emailFromToken : me?.email,
      };
      persistUserCache(fixedMe);
      setUser(mapUserWithDefaultAvatar(fixedMe));
    };

    const fallbackToCache = (accessToken) => {
      const cached = readCachedUserPayload();
      if (!cached) return;
      const emailFromToken = decodeJwtSubject(accessToken);
      const fixedCached = {
        ...cached,
        email: isBlank(cached.email) ? emailFromToken : cached.email,
      };
      setUser(mapUserWithDefaultAvatar(fixedCached));
    };

    (async () => {
      const refreshTok = localStorage.getItem(REFRESH_TOKEN_KEY);
      try {
        const me = await apiClient.me(token);
        if (cancelled) return;
        applyMePayload(me, token);
      } catch (e) {
        if (cancelled) return;
        const msg = String(e?.message ?? "");
        const looksUnauthorized =
          msg.includes("401") ||
          msg.includes("AUTH_REQUIRED") ||
          msg.includes("đăng nhập");
        if (looksUnauthorized && refreshTok) {
          try {
            const result = await apiClient.refresh(refreshTok);
            if (cancelled) return;
            localStorage.setItem(TOKEN_KEY, result.accessToken);
            localStorage.setItem(REFRESH_TOKEN_KEY, result.refreshToken);
            setToken(result.accessToken);
            setRefreshToken(result.refreshToken);
            const me2 = await apiClient.me(result.accessToken);
            if (cancelled) return;
            applyMePayload(me2, result.accessToken);
            return;
          } catch {
            // tiếp tục fallback cache
          }
        }
        fallbackToCache(token);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [token]);

  const value = {
    token,
    refreshToken,
    user,
    login,
    register,
    refreshSession,
    refreshProfile,
    updateProfile,
    completeOAuthLogin,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
