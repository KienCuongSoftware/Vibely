import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useState,
} from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import { isPendingOAuthBrowserCallback } from "@/features/auth/utils/oauthCallback.js";
import { registerGuestLoginOpener } from "@/features/auth/utils/guestAuthGate.js";
import { hasLoginRedirectParam } from "@/features/auth/utils/loginRedirect.js";
import { OPEN_LOGIN_AFTER_LOAD_KEY, FORCE_GUEST_AFTER_LOAD_KEY } from "@/shared/utils/lazyWithChunkRetry.js";
import { hasLoggedOutGuard } from "@/features/auth/utils/loggedOutGuard.js";

const GuestAuthUiContext = createContext(null);

function isLoginPath(pathname) {
  return pathname === "/login" || pathname === "/signin";
}

function isSignupPath(pathname) {
  return pathname === "/signup" || pathname === "/register";
}

export function GuestAuthUiProvider({ children }) {
  const [mode, setMode] = useState(null);
  const navigate = useNavigate();
  const location = useLocation();

  const openLogin = useCallback(() => setMode("login"), []);
  const openSignup = useCallback(() => setMode("signup"), []);
  const close = useCallback(() => setMode(null), []);

  useEffect(() => {
    registerGuestLoginOpener(openLogin);
    return () => registerGuestLoginOpener(null);
  }, [openLogin]);

  useEffect(() => {
    try {
      if (sessionStorage.getItem(OPEN_LOGIN_AFTER_LOAD_KEY) === "1") {
        sessionStorage.removeItem(OPEN_LOGIN_AFTER_LOAD_KEY);
        openLogin();
      }
    } catch {
      /* ignore */
    }
  }, [openLogin]);

  useEffect(() => {
    const { pathname, search } = location;
    if (isLoginPath(pathname)) {
      if (isPendingOAuthBrowserCallback() || hasLoginRedirectParam(search)) {
        setMode(null);
        return;
      }
      setMode("login");
      navigate({ pathname: "/", search }, { replace: true });
      return;
    }
    if (isSignupPath(pathname)) {
      setMode("signup");
      navigate({ pathname: "/", search }, { replace: true });
    }
  }, [location.pathname, location.search, navigate]);

  const value = useMemo(
    () => ({
      mode,
      openLogin,
      openSignup,
      close,
    }),
    [mode, openLogin, openSignup, close],
  );

  return (
    <GuestAuthUiContext.Provider value={value}>
      {children}
    </GuestAuthUiContext.Provider>
  );
}

export function useGuestAuthUi() {
  return useContext(GuestAuthUiContext);
}

const closeBtnClass =
  "vibely-auth-icon-btn flex h-10 w-10 items-center justify-center rounded-full bg-zinc-800 text-zinc-200 hover:bg-zinc-700";

export function GuestAuthCloseButton({
  asModal,
  "aria-label": ariaLabel,
  children,
}) {
  const ui = useGuestAuthUi();
  if (!asModal) {
    return (
      <Link to="/" className={closeBtnClass} aria-label={ariaLabel}>
        {children}
      </Link>
    );
  }
  return (
    <button
      type="button"
      className={closeBtnClass}
      aria-label={ariaLabel}
      onClick={() => ui?.close()}
    >
      {children}
    </button>
  );
}

export function GuestLoginTrigger({ className, children, onClick }) {
  const ui = useGuestAuthUi();
  if (ui) {
    return (
      <button
        type="button"
        className={className}
        onClick={() => {
          onClick?.();
          ui.openLogin();
        }}
      >
        {children}
      </button>
    );
  }
  return (
    <Link to="/login" className={className} onClick={onClick}>
      {children}
    </Link>
  );
}

/** Guest gated routes: stay on home URL and open the login overlay. */
export function RedirectToHomeLogin() {
  const ui = useGuestAuthUi();
  const openLogin = ui?.openLogin;
  useLayoutEffect(() => {
    // Skip login flash during / after explicit logout.
    try {
      if (
        sessionStorage.getItem(FORCE_GUEST_AFTER_LOAD_KEY) === "1" ||
        hasLoggedOutGuard()
      ) {
        return;
      }
    } catch {
      /* ignore */
    }
    openLogin?.();
  }, [openLogin]);
  return <Navigate to="/" replace />;
}

export { isLoginPath, isSignupPath };
