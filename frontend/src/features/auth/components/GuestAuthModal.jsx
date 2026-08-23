import React, { lazy, Suspense } from "react";
import { useLocation } from "react-router-dom";

const LoginPage = lazy(() =>
  import("@/features/auth/pages/LoginPage.jsx").then((m) => ({ default: m.LoginPage })),
);
const SignupPage = lazy(() =>
  import("@/features/auth/pages/SignupPage.jsx").then((m) => ({ default: m.SignupPage })),
);

function isLoginPath(pathname) {
  return pathname === "/login" || pathname === "/signin";
}

function isSignupPath(pathname) {
  return pathname === "/signup" || pathname === "/register";
}

/** Overlay đăng nhập / đăng ký trên feed (kiểu TikTok), không thay cả trang. */
export function GuestAuthModal() {
  const { pathname } = useLocation();
  if (isSignupPath(pathname)) {
    return (
      <Suspense fallback={null}>
        <SignupPage asModal />
      </Suspense>
    );
  }
  if (isLoginPath(pathname)) {
    return (
      <Suspense fallback={null}>
        <LoginPage asModal />
      </Suspense>
    );
  }
  return null;
}
