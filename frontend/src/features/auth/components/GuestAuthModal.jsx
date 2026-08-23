import React, { lazy, Suspense } from "react";
import { useLocation } from "react-router-dom";
import { useGuestAuthUi, isLoginPath, isSignupPath } from "@/features/auth/store/GuestAuthUiContext.jsx";
import { hasLoginRedirectParam } from "@/features/auth/utils/loginRedirect.js";

const LoginPage = lazy(() =>
  import("@/features/auth/pages/LoginPage.jsx").then((m) => ({ default: m.LoginPage })),
);
const SignupPage = lazy(() =>
  import("@/features/auth/pages/SignupPage.jsx").then((m) => ({ default: m.SignupPage })),
);

/** Overlay đăng nhập / đăng ký trên feed (kiểu TikTok), không thay cả trang. */
export function GuestAuthModal() {
  const { pathname, search } = useLocation();
  const ui = useGuestAuthUi();
  const showSignup = ui?.mode === "signup" || isSignupPath(pathname);
  const showLogin =
    (ui?.mode === "login" || isLoginPath(pathname)) &&
    !hasLoginRedirectParam(search);

  if (showSignup) {
    return (
      <Suspense fallback={null}>
        <SignupPage asModal />
      </Suspense>
    );
  }
  if (showLogin) {
    return (
      <Suspense fallback={null}>
        <LoginPage asModal />
      </Suspense>
    );
  }
  return null;
}
