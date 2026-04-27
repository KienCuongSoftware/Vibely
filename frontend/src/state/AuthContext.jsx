import React from "react";
import { useState } from "react";
import { apiClient } from "../api/client";
import { AuthContext } from "./auth-context";

const TOKEN_KEY = "vibely_token";
const REFRESH_TOKEN_KEY = "vibely_refresh_token";
const DEFAULT_AVATAR_URL = "/images/users/default-avatar.jpeg";

function mapUserWithDefaultAvatar(userLike) {
  return {
    ...userLike,
    avatarUrl: userLike?.avatarUrl ?? DEFAULT_AVATAR_URL,
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
    setUser(
      mapUserWithDefaultAvatar({
        id: result.userId,
        username: result.username,
        displayName: result.displayName,
        email: result.email,
        avatarUrl: result.avatarUrl,
      }),
    );
    return result;
  };

  const register = async (payload) => {
    const result = await apiClient.register(payload);
    localStorage.setItem(TOKEN_KEY, result.accessToken);
    localStorage.setItem(REFRESH_TOKEN_KEY, result.refreshToken);
    setToken(result.accessToken);
    setRefreshToken(result.refreshToken);
    setUser(
      mapUserWithDefaultAvatar({
        id: result.userId,
        username: result.username,
        displayName: result.displayName,
        email: result.email,
        avatarUrl: result.avatarUrl,
      }),
    );
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
    setUser(mapUserWithDefaultAvatar(me));
    return me;
  };

  const completeOAuthLogin = (payload) => {
    localStorage.setItem(TOKEN_KEY, payload.accessToken);
    localStorage.setItem(REFRESH_TOKEN_KEY, payload.refreshToken);
    setToken(payload.accessToken);
    setRefreshToken(payload.refreshToken);
    setUser(
      mapUserWithDefaultAvatar({
        id: payload.userId,
        username: payload.username,
        displayName: payload.displayName,
        email: payload.email,
        avatarUrl: payload.avatarUrl,
      }),
    );
  };

  const logout = () => {
    if (refreshToken) {
      apiClient.logout(refreshToken).catch(() => {});
    }
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
    setToken(null);
    setRefreshToken(null);
    setUser(null);
  };

  const value = {
    token,
    refreshToken,
    user,
    login,
    register,
    refreshSession,
    refreshProfile,
    completeOAuthLogin,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
