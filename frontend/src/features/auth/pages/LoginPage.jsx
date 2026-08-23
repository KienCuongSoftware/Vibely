import React from "react";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { apiClient } from "@/shared/api/client";
import { FaFacebook, FaUser } from "react-icons/fa";
import { FcGoogle } from "react-icons/fc";
import { SiLine } from "react-icons/si";
import {
  IoArrowBack,
  IoClose,
  IoEyeOffOutline,
  IoEyeOutline,
} from "react-icons/io5";

import { consumePendingAccountBanned } from "@/features/auth/utils/accountBanBridge.js";
import { resolveBackendOrigin } from "@/shared/config/apiBase.js";
import { normalizeLastLoginMethod } from "@/features/auth/utils/lastLoginMethod.js";
import {
  persistLastLoginMethod,
  useLastLoginMethod,
} from "@/features/auth/hooks/useLastLoginMethod.js";
import {
  AUTH_FIELD,
  AUTH_FIELD_OTP,
  AUTH_FIELD_WITH_ICON,
} from "@/features/auth/components/authFieldClasses.js";
import { LoginMethodButton } from "@/features/auth/components/LoginMethodButton.jsx";
import { ChallengeModal } from "@/security/captcha/ChallengeModal.jsx";
import {
  buildAntiBotHeaders,
  CAPTCHA_VERIFICATION_HEADER,
} from "@/security/headers/buildAntiBotHeaders.js";
import { useAntiBot } from "@/security/hooks/useAntiBot.js";
import { clearVerificationToken } from "@/security/sdk/antiBotClient.js";
import { collectLoginContext } from "@/security/loginContext.js";
import {
  buildOnboardingPendingFromUser,
  persistOnboardingPending,
  userNeedsOnboarding,
} from "@/features/auth/utils/onboarding.js";

const BANNED_APPEAL_EMAIL_STORAGE_KEY = "vibely:bannedAppealEmail";

function readStoredBannedAppealEmail() {
  try {
    const stored = sessionStorage.getItem(BANNED_APPEAL_EMAIL_STORAGE_KEY);
    if (!stored) return "";
    const normalized = stored.trim().toLowerCase();
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized) ? normalized : "";
  } catch {
    return "";
  }
}

function persistBannedAppealEmail(email) {
  try {
    const normalized = String(email ?? "").trim().toLowerCase();
    if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) {
      sessionStorage.setItem(BANNED_APPEAL_EMAIL_STORAGE_KEY, normalized);
    }
  } catch {
    // sessionStorage may be unavailable in some browsers.
  }
}

function clearStoredBannedAppealEmail() {
  try {
    sessionStorage.removeItem(BANNED_APPEAL_EMAIL_STORAGE_KEY);
  } catch {
    // ignore
  }
}

export function LoginPage({ asModal = false }) {
  const { token, user, login, reactivateAccount, completeOAuthLogin, refreshProfile, authReady } = useAuth();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const oauthInFlightRef = useRef(false);
  const processedOAuthCodeRef = useRef("");
  const bannedPayloadRef = useRef(null);
  const pendingCaptchaActionRef = useRef(null);
  const [view, setView] = useState("methods");
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [resetCode, setResetCode] = useState("");
  const [resetPassword, setResetPassword] = useState("");
  const [showResetPassword, setShowResetPassword] = useState(false);
  const [resendSeconds, setResendSeconds] = useState(0);
  const [sendingResetCode, setSendingResetCode] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const [sendResetError, setSendResetError] = useState("");
  const [isResetPasswordFocused, setIsResetPasswordFocused] = useState(false);
  const [reactivationOpen, setReactivationOpen] = useState(false);
  const [reactivationToken, setReactivationToken] = useState("");
  const [reactivationMaskedEmail, setReactivationMaskedEmail] = useState("");
  const [reactivationProvider, setReactivationProvider] = useState("");
  const [reactivationCode, setReactivationCode] = useState("");
  const [reactivationCodeSent, setReactivationCodeSent] = useState(false);
  const [reactivationLoading, setReactivationLoading] = useState(false);
  const [reactivationError, setReactivationError] = useState("");
  const [bannedOpen, setBannedOpen] = useState(false);
  const [bannedReason, setBannedReason] = useState("");
  const [bannedMaskedEmail, setBannedMaskedEmail] = useState("");
  const [bannedAccountEmail, setBannedAccountEmail] = useState("");
  const [bannedAppealOpen, setBannedAppealOpen] = useState(false);
  const [appealDescription, setAppealDescription] = useState("");
  const [appealEmail, setAppealEmail] = useState("");
  const [appealLoading, setAppealLoading] = useState(false);
  const [appealError, setAppealError] = useState("");
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(false);
  const lastLoginMethod = useLastLoginMethod();
  const {
    challengeOpen,
    challengeLevel,
    closeChallenge,
    onChallengeVerified,
    ensureHuman,
    handleCaptchaRequired,
  } = useAntiBot("login");
  const canSubmit =
    identifier.trim().length > 0 && password.trim().length > 0 && !loading;
  const normalizedResetEmail = resetEmail.trim().toLowerCase();
  const isResetEmailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedResetEmail);
  const resetPasswordHasValidLength =
    resetPassword.length >= 8 && resetPassword.length <= 20;
  const resetPasswordHasRequiredCharacters =
    /[A-Za-z]/.test(resetPassword) &&
    /\d/.test(resetPassword) &&
    /[^A-Za-z0-9]/.test(resetPassword);
  const hasResetPasswordInput = resetPassword.length > 0;
  const isResetPasswordValid =
    resetPasswordHasValidLength && resetPasswordHasRequiredCharacters;
  const canSendResetCode =
    isResetEmailValid && resendSeconds === 0 && !sendingResetCode;
  const canResetPassword =
    isResetEmailValid &&
    resetCode.trim().length === 6 &&
    isResetPasswordValid &&
    !resetLoading;
  const canConfirmReactivation =
    reactivationToken.trim().length > 0 &&
    reactivationCode.trim().length === 6 &&
    !reactivationLoading;
  const normalizedAppealEmail = appealEmail.trim().toLowerCase();
  const isAppealEmailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedAppealEmail);
  const appealDescriptionLength = appealDescription.length;
  const canSubmitBanAppeal =
    appealDescription.trim().length >= 5 &&
    appealDescriptionLength <= 200 &&
    isAppealEmailValid &&
    !appealLoading;
  const challengePurpose =
    pendingCaptchaActionRef.current === "sendResetCode"
      ? "PASSWORD_RESET"
      : "LOGIN";
  const oauthErrorMessage = (() => {
    if (searchParams.get("oauth") !== "error") return "";
    const reason = searchParams.get("reason");
    if (reason === "clock_skew") {
      return t('auth.oauthClockSkew');
    }
    if (reason === "redirect_mismatch") {
      return t('auth.oauthRedirectMismatch');
    }
    if (reason === "session_lost") {
      return t('auth.oauthSessionLost');
    }
    if (reason === "invalid_grant") {
      return t('auth.oauthCodeExpired');
    }
    if (reason === "invalid_client") {
      return t('auth.oauthGoogleSecretInvalid');
    }
    return (
      searchParams.get("message") ??
      t('auth.oauthFailed')
    );
  })();

  useEffect(() => {
    document.title =
      view === "forgot" ? `${t('auth.resetPasswordTitle')} | Vibely` : `${t('auth.loginShort')} | Vibely`;
  }, [view, t]);

  useEffect(() => {
    if (resendSeconds <= 0) {
      return undefined;
    }
    const timer = window.setInterval(() => {
      setResendSeconds((prev) => (prev <= 1 ? 0 : prev - 1));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [resendSeconds]);

  useEffect(() => {
    if (!authReady) return;

    if (token && user) {
      if (userNeedsOnboarding(user)) {
        persistOnboardingPending(buildOnboardingPendingFromUser(user));
        navigate("/signup?onboarding=oauth", { replace: true });
        return;
      }
      const destination = String(user.role ?? "").toUpperCase() === "ADMIN" ? "/admin" : "/";
      navigate(destination, { replace: true });
      return;
    }

    if (searchParams.get("reactivate") === "1") {
      setReactivationToken(searchParams.get("token") ?? "");
      setReactivationMaskedEmail(searchParams.get("maskedEmail") ?? "");
      setReactivationProvider(normalizeLastLoginMethod(searchParams.get("provider")) ?? "");
      setReactivationOpen(true);
      setReactivationCode("");
      setReactivationCodeSent(false);
      setReactivationError("");
      navigate("/login", { replace: true });
      return;
    }

    if (searchParams.get("banned") === "1") {
      const provider = normalizeLastLoginMethod(searchParams.get("provider")) ?? "";
      if (provider) {
        persistLastLoginMethod(provider);
      }
      const accountEmailFromUrl = String(searchParams.get("accountEmail") ?? "").trim();
      if (accountEmailFromUrl) {
        persistBannedAppealEmail(accountEmailFromUrl);
      }
      applyBannedState({
        reason: searchParams.get("reason"),
        accountEmail: accountEmailFromUrl,
        email: accountEmailFromUrl,
        maskedEmail: searchParams.get("maskedEmail"),
      });
      navigate("/login", { replace: true });
      return;
    }

    const oauthStatus = searchParams.get("oauth");
    if (!oauthStatus) return;
    if (oauthStatus !== "success") {
      return;
    }

    const oauthProvider = normalizeLastLoginMethod(
      searchParams.get("provider"),
    );

    const oneTimeCode = searchParams.get("code");
    if (!oneTimeCode) {
      navigate(
        "/login?oauth=error&message=Thi%E1%BA%BFu%20m%C3%A3%20x%C3%A1c%20th%E1%BB%B1c%20OAuth%2C%20vui%20l%C3%B2ng%20th%E1%BB%AD%20l%E1%BA%A1i",
        { replace: true },
      );
      return;
    }
    if (
      oauthInFlightRef.current ||
      processedOAuthCodeRef.current === oneTimeCode
    ) {
      return;
    }

    oauthInFlightRef.current = true;
    processedOAuthCodeRef.current = oneTimeCode;

    apiClient
      .exchangeOAuthCode(oneTimeCode)
      .then(async (oauthData) => {
        // Chỉ tin payload exchange. Không merge /me lên trên — cookie host-only cũ
        // (admin) có thể vẫn được gửi kèm cookie Domain=.vibely.sbs mới (LINE).
        let me = null;
        try {
          me = await apiClient.me();
        } catch {
          // ignore
        }
        const oauthEmail = String(oauthData?.email ?? "")
          .trim()
          .toLowerCase();
        const meEmail = String(me?.email ?? "")
          .trim()
          .toLowerCase();
        if (oauthEmail && meEmail && oauthEmail !== meEmail) {
          try {
            await apiClient.logout();
          } catch {
            // ignore
          }
          navigate(
            `/login?oauth=error&message=${encodeURIComponent(
              t('auth.oauthStaleSession'),
            )}`,
            { replace: true },
          );
          return;
        }

        const needsOnboarding = Boolean(oauthData?.needsOnboarding);
        if (needsOnboarding) {
          const pending = {
            userId: Number(oauthData.userId),
            email: oauthData.email,
            displayName: oauthData.displayName,
            avatarUrl: oauthData.avatarUrl,
            username: oauthData.username,
            provider: oauthProvider ?? undefined,
          };
          completeOAuthLogin({
            userId: pending.userId,
            username: pending.username,
            displayName: pending.displayName,
            email: pending.email,
            role: oauthData.role,
            avatarUrl: pending.avatarUrl,
            needsOnboarding: true,
          });
          persistOnboardingPending(pending);
          navigate("/signup?onboarding=oauth", { replace: true });
          return;
        }

        if (oauthProvider) {
          persistLastLoginMethod(oauthProvider);
        }
        completeOAuthLogin({
          userId: Number(oauthData.userId),
          username: oauthData.username,
          displayName: oauthData.displayName,
          email: oauthData.email,
          role: oauthData.role,
          avatarUrl: oauthData.avatarUrl,
        });
        try {
          await refreshProfile();
        } catch {
          // Cookie session from exchange is enough; profile refresh is best-effort.
        }
        navigate(
          String(oauthData.role ?? "").toUpperCase() === "ADMIN"
            ? "/admin"
            : "/",
          { replace: true },
        );
      })
      .catch((error) => {
        oauthInFlightRef.current = false;
        if (error.code === "ACCOUNT_BANNED") {
          openBannedModal(error.data);
          navigate("/login", { replace: true });
          return;
        }
        navigate(
          `/login?oauth=error&message=${encodeURIComponent(error.message || t('auth.oauthFailed'))}`,
          { replace: true },
        );
      });
  }, [authReady, completeOAuthLogin, navigate, refreshProfile, searchParams, token, user]);

  const startOAuth = (provider) => {
    let origin = resolveBackendOrigin();
    try {
      const url = new URL(origin);
      // Apex vibely.sbs redirects to www; start OAuth on www to keep session cookies consistent.
      if (url.hostname === "vibely.sbs") {
        url.hostname = "www.vibely.sbs";
        origin = url.origin;
      }
    } catch {
      // keep resolveBackendOrigin()
    }
    window.location.href = `${origin}/api/oauth2/authorization/${provider}`;
  };

  const openReactivationModal = (payload, provider = "") => {
    setReactivationToken(payload?.reactivationToken ?? "");
    setReactivationMaskedEmail(payload?.maskedEmail ?? "");
    setReactivationProvider(provider);
    setReactivationCode("");
    setReactivationCodeSent(false);
    setReactivationError("");
    setReactivationOpen(true);
  };

  const resolveBannedAccountEmail = (payload = {}, loginId = identifier) => {
    const candidates = [
      payload?.email,
      payload?.accountEmail,
      bannedPayloadRef.current?.email,
      bannedPayloadRef.current?.accountEmail,
      readStoredBannedAppealEmail(),
    ];
    for (const raw of candidates) {
      const normalized = String(raw ?? "").trim().toLowerCase();
      if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) {
        return normalized;
      }
    }
    const loginIdentifier = String(loginId ?? "").trim().toLowerCase();
    if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(loginIdentifier)) {
      return loginIdentifier;
    }
    return "";
  };

  const applyBannedState = (payload = {}) => {
    const accountEmail = resolveBannedAccountEmail(payload);
    if (accountEmail) {
      persistBannedAppealEmail(accountEmail);
    }
    const normalizedPayload = {
      reason: String(payload?.reason ?? "").trim(),
      maskedEmail: String(payload?.maskedEmail ?? "").trim(),
      email: accountEmail,
      accountEmail,
    };
    bannedPayloadRef.current = normalizedPayload;
    setBannedReason(normalizedPayload.reason);
    setBannedMaskedEmail(normalizedPayload.maskedEmail);
    setBannedAccountEmail(accountEmail);
    setBannedOpen(true);
    setStatus("");
  };

  const openBannedModal = (payload = {}) => {
    applyBannedState(payload);
  };

  useEffect(() => {
    const pending = consumePendingAccountBanned();
    if (pending) {
      openBannedModal(pending);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- show mid-session ban modal once on mount
  }, []);

  const closeBannedModal = () => {
    setBannedOpen(false);
    setBannedAppealOpen(false);
    bannedPayloadRef.current = null;
    clearStoredBannedAppealEmail();
    setBannedReason("");
    setBannedMaskedEmail("");
    setBannedAccountEmail("");
    setAppealDescription("");
    setAppealEmail("");
    setAppealError("");
    setAppealLoading(false);
  };

  const openBannedAppealModal = () => {
    const resolvedEmail =
      bannedAccountEmail.trim() ||
      resolveBannedAccountEmail(bannedPayloadRef.current ?? {});
    if (resolvedEmail && resolvedEmail !== bannedAccountEmail) {
      setBannedAccountEmail(resolvedEmail);
    }
    setAppealDescription("");
    setAppealEmail(resolvedEmail);
    setAppealError("");
    setBannedAppealOpen(true);
  };

  const closeBannedAppealModal = () => {
    if (appealLoading) return;
    setBannedAppealOpen(false);
    setAppealDescription("");
    setAppealEmail("");
    setAppealError("");
  };

  const submitBanAppeal = async () => {
    if (!canSubmitBanAppeal) return;
    setAppealLoading(true);
    setAppealError("");
    try {
      await apiClient.submitBanAppeal({
        email: normalizedAppealEmail,
        description: appealDescription.trim(),
        banReason: bannedReason.trim() || undefined,
        maskedAccountEmail: bannedMaskedEmail.trim() || undefined,
      });
      closeBannedModal();
      setStatus(
        t('auth.appealSentToast'),
      );
    } catch (error) {
      setAppealError(error.message);
    } finally {
      setAppealLoading(false);
    }
  };

  const closeReactivationModal = () => {
    if (reactivationLoading) return;
    setReactivationOpen(false);
    setReactivationCode("");
    setReactivationCodeSent(false);
    setReactivationError("");
    setReactivationMaskedEmail("");
    setReactivationToken("");
  };

  const sendReactivationCode = async () => {
    if (!reactivationToken.trim()) {
      setReactivationError(t('auth.reactivateInvalidSession'));
      return;
    }
    setReactivationLoading(true);
    setReactivationError("");
    try {
      const loginContext = await collectLoginContext({ requireLocation: true });
      const result = await apiClient.sendReactivationCode({
        reactivationToken,
        loginContext,
      });
      setReactivationCodeSent(true);
      if (result?.demoCode) {
        setReactivationError(t('auth.reactivateDemo', { code: result.demoCode }));
      }
    } catch (error) {
      setReactivationError(error.message);
    } finally {
      setReactivationLoading(false);
    }
  };

  const confirmReactivation = async () => {
    if (!canConfirmReactivation) return;
    setReactivationLoading(true);
    setReactivationError("");
    try {
      const result = await reactivateAccount({
        reactivationToken,
        code: reactivationCode.trim(),
      });
      if (reactivationProvider) {
        persistLastLoginMethod(reactivationProvider);
      }
      setReactivationOpen(false);
      setStatus(t('auth.reactivateSuccess'));
      navigate(String(result?.role ?? "").toUpperCase() === "ADMIN" ? "/admin" : "/", {
        replace: true,
      });
    } catch (error) {
      setReactivationError(error.message);
    } finally {
      setReactivationLoading(false);
    }
  };

  const performLogin = async () => {
    const attemptedIdentifier = identifier.trim();
    if (attemptedIdentifier) {
      persistBannedAppealEmail(attemptedIdentifier);
    }
    setLoading(true);
    setStatus(t('auth.loggingIn'));
    try {
      const result = await login(identifier, password, buildAntiBotHeaders());
      clearVerificationToken();
      persistLastLoginMethod("email");
      setStatus(t('auth.loginSuccess'));
      if (result?.needsOnboarding) {
        persistOnboardingPending({
          userId: Number(result.userId),
          email: result.email,
          displayName: result.displayName,
          username: result.username,
        });
        navigate("/signup?onboarding=oauth", { replace: true });
        return;
      }
      navigate(String(result?.role ?? "").toUpperCase() === "ADMIN" ? "/admin" : "/", {
        replace: true,
      });
    } catch (error) {
      if (error.code === "ACCOUNT_DEACTIVATED") {
        openReactivationModal(error.data, "email");
        setStatus("");
        return;
      }
      if (error.code === "ACCOUNT_BANNED") {
        openBannedModal(error.data);
        setStatus("");
        return;
      }
      if (error.captchaRequired || error.code === "CAPTCHA_REQUIRED") {
        handleCaptchaRequired(error.captchaRequired ?? { challengeLevel: "ROTATE" });
        setStatus(t('auth.completeCaptcha'));
        return;
      }
      if (
        typeof error.message === "string" &&
        error.message.includes("Captcha verification")
      ) {
        clearVerificationToken();
        handleCaptchaRequired({ challengeLevel: "ROTATE" });
        setStatus(t('auth.captchaExpired'));
        return;
      }
      setStatus(error.message);
    } finally {
      setLoading(false);
    }
  };

  const doSendResetCode = async () => {
    setSendingResetCode(true);
    setSendResetError("");
    try {
      const headers = buildAntiBotHeaders();
      const result = await apiClient.sendCode(
        {
          email: normalizedResetEmail,
          purpose: "PASSWORD_RESET",
          challengePassed: !headers[CAPTCHA_VERIFICATION_HEADER],
        },
        headers,
      );
      const cooldown = Number(result?.resendAfterSeconds) || 60;
      setResendSeconds(cooldown);
      clearVerificationToken();
      if (result?.emailSent) {
        setStatus(
          t('auth.resetOtpSent', { email: normalizedResetEmail }),
        );
      } else if (result?.demoCode) {
        setStatus(t('auth.resetOtpDemo', { code: result.demoCode }));
      } else {
        setStatus(
          t('auth.resetOtpGeneric'),
        );
      }
    } catch (error) {
      if (
        typeof error.message === "string" &&
        error.message.includes("Captcha verification")
      ) {
        clearVerificationToken();
        pendingCaptchaActionRef.current = "sendResetCode";
        handleCaptchaRequired({ challengeLevel: "ROTATE" });
        setSendResetError(t('auth.captchaExpired'));
        return;
      }
      setSendResetError(error.message);
    } finally {
      setSendingResetCode(false);
    }
  };

  const handleSendResetCode = async () => {
    if (!canSendResetCode) return;
    pendingCaptchaActionRef.current = "sendResetCode";
    setSendResetError("");
    try {
      const human = await ensureHuman();
      if (human.verified) {
        pendingCaptchaActionRef.current = null;
        await doSendResetCode();
      }
    } catch (error) {
      pendingCaptchaActionRef.current = null;
      setSendResetError(error.message);
    }
  };

  const submitResetPassword = async (event) => {
    event.preventDefault();
    if (!canResetPassword) {
      setStatus(t('auth.resetFillAll'));
      return;
    }
    setResetLoading(true);
    setStatus(t('auth.resettingPassword'));
    try {
      await apiClient.resetPassword({
        email: normalizedResetEmail,
        code: resetCode.trim(),
        newPassword: resetPassword,
      });
      setStatus(t('auth.resetSuccess'));
      setIdentifier(normalizedResetEmail);
      setPassword("");
      setResetCode("");
      setResetPassword("");
      setView("credentials");
    } catch (error) {
      setStatus(error.message);
    } finally {
      setResetLoading(false);
    }
  };

  const openForgotPassword = () => {
    clearVerificationToken();
    setView("forgot");
    setStatus("");
    setSendResetError("");
    if (identifier.includes("@")) {
      setResetEmail(identifier.trim());
    }
  };

  const submitWithCredentials = async (event) => {
    event.preventDefault();
    if (!identifier.trim() || !password.trim()) {
      setStatus(t('auth.enterCredentials'));
      return;
    }
    try {
      const human = await ensureHuman();
      if (!human.verified) {
        setStatus(t('auth.completeCaptcha'));
        return;
      }
      await performLogin();
    } catch (error) {
      setStatus(error.message);
    }
  };

  return (
    <section
      className={
        asModal
          ? "vibely-auth-page fixed inset-0 z-[240] flex items-center justify-center overflow-y-auto bg-black/50 px-4 py-6 text-zinc-100"
          : "vibely-auth-page relative flex min-h-screen items-center justify-center overflow-hidden bg-black/70 px-4 py-6 text-zinc-100"
      }
    >
      <ChallengeModal
        open={challengeOpen}
        challengeLevel={challengeLevel}
        purpose={challengePurpose}
        onClose={closeChallenge}
        onVerified={() => {
          onChallengeVerified();
          const action = pendingCaptchaActionRef.current;
          pendingCaptchaActionRef.current = null;
          if (action === "sendResetCode") {
            doSendResetCode();
            return;
          }
          performLogin();
        }}
      />
      {bannedOpen && !bannedAppealOpen ? (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/70 px-4">
          <div className="w-full max-w-[340px] overflow-hidden rounded-sm border border-zinc-800 bg-[#121212] text-center shadow-2xl">
            <div className="px-6 py-6">
              <h2 className="text-xl font-bold text-zinc-100">
                {t('auth.banned.title')}
              </h2>
              <p className="mt-4 text-[13px] leading-relaxed text-zinc-300">
                {t('auth.banned.reason')}{" "}
                <span className="font-semibold text-zinc-100">
                  {bannedReason.trim()
                    ? bannedReason.trim()
                    : t('auth.banned.defaultReason')}
                </span>
                .
              </p>
              <p className="mt-3 text-[13px] leading-relaxed text-zinc-400">
                {t('auth.banned.suggestion')}
              </p>
            </div>
            <div className="border-t border-zinc-800">
              <button
                type="button"
                className="flex h-12 w-full items-center justify-center text-[15px] font-semibold text-white transition hover:bg-zinc-900"
                onClick={openBannedAppealModal}
              >
                {t('auth.banned.appeal')}
              </button>
              <button
                type="button"
                className="h-12 w-full border-t border-zinc-800 text-[15px] font-medium text-zinc-200 hover:bg-zinc-900"
                onClick={closeBannedModal}
              >
                {t('auth.banned.ignore')}
              </button>
            </div>
          </div>
        </div>
      ) : null}
      {bannedOpen && bannedAppealOpen ? (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/70 px-4">
          <div className="w-full max-w-[420px] overflow-hidden rounded-lg border border-zinc-800 bg-[#121212] shadow-2xl">
            <div className="relative border-b border-zinc-800 px-4 py-4">
              <button
                type="button"
                className="absolute left-3 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full text-zinc-200 hover:bg-zinc-900"
                onClick={closeBannedAppealModal}
                disabled={appealLoading}
                aria-label={t('common.back')}
              >
                <IoArrowBack className="h-5 w-5" />
              </button>
              <h2 className="text-center text-[17px] font-bold text-zinc-100">
                {t('auth.appeal.title')}
              </h2>
            </div>
            <div className="scrollbar-none max-h-[min(70vh,560px)] overflow-y-auto px-5 py-4">
              <p className="text-[13px] leading-relaxed text-zinc-400">
                {t('auth.appeal.description')}
              </p>
              <div className="mt-4 rounded-md border border-zinc-800 bg-zinc-950/70 p-4">
                <label className="block text-[13px] font-semibold text-zinc-100">
                  {t('auth.appeal.descLabel')} <span className="text-red-500">*</span>
                </label>
                <p className="mt-1 text-[12px] text-zinc-500">
                  {t('auth.appeal.descHint')}
                </p>
                <div className="relative mt-3">
                  <textarea
                    className="min-h-[120px] w-full resize-none rounded-md border border-zinc-800 bg-zinc-900 px-3 py-2.5 text-[14px] text-zinc-100 outline-none focus:border-zinc-600"
                    maxLength={200}
                    value={appealDescription}
                    onChange={(event) => setAppealDescription(event.target.value)}
                    disabled={appealLoading}
                  />
                  <span className="pointer-events-none absolute bottom-2 right-3 text-[11px] text-zinc-500">
                    {appealDescriptionLength}/200
                  </span>
                </div>
              </div>
              <div className="mt-4 rounded-md border border-zinc-800 bg-zinc-950/70 p-4">
                <label className="block text-[13px] font-semibold text-zinc-100">
                  Email <span className="text-red-500">*</span>
                </label>
                <p className="mt-1 text-[12px] text-zinc-500">
                  {t('auth.appeal.emailHint')}
                  {bannedAccountEmail ? t('auth.appealEmailChangeHint') : ""}
                </p>
                <input
                  type="email"
                  className="mt-3 h-11 w-full rounded-md border border-zinc-800 bg-zinc-900 px-3 text-[14px] text-zinc-100 outline-none focus:border-zinc-600"
                  placeholder="example@example.com"
                  value={appealEmail}
                  onChange={(event) => setAppealEmail(event.target.value)}
                  disabled={appealLoading}
                  autoComplete="email"
                />
              </div>
              {appealError ? (
                <p className="mt-3 text-[12px] text-red-400">{appealError}</p>
              ) : null}
            </div>
            <div className="flex justify-end border-t border-zinc-800 px-5 py-4">
              <button
                type="button"
                className="rounded-md bg-zinc-100 px-5 py-2 text-[14px] font-semibold text-zinc-900 transition enabled:hover:bg-white disabled:cursor-not-allowed disabled:bg-zinc-700 disabled:text-zinc-400"
                onClick={submitBanAppeal}
                disabled={!canSubmitBanAppeal}
              >
                {appealLoading ? t('auth.appeal.submitting') : t('auth.appeal.submit')}
              </button>
            </div>
          </div>
        </div>
      ) : null}
      {reactivationOpen ? (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/70 px-4">
          <div className="w-full max-w-[340px] overflow-hidden rounded-sm border border-zinc-800 bg-[#121212] text-center shadow-2xl">
            <div className="px-6 py-6">
              <h2 className="text-xl font-bold text-zinc-100">
                {t('auth.reactivate.title')}
              </h2>
              <p className="mt-4 text-[13px] leading-relaxed text-zinc-300">
                {t('auth.reactivate.description')}
              </p>
              {reactivationMaskedEmail ? (
                <p className="mt-3 break-all text-[12px] text-zinc-500">
                  {reactivationMaskedEmail}
                </p>
              ) : null}
              {reactivationCodeSent ? (
                <div className="mt-4 text-left">
                  <label className="mb-1 block text-[12px] font-medium text-zinc-300">
                    {t('auth.reactivate.otpLabel')}
                  </label>
                  <input
                    className={AUTH_FIELD}
                    inputMode="numeric"
                    maxLength={6}
                    placeholder={t('auth.reactivate.otpPlaceholder')}
                    value={reactivationCode}
                    onChange={(event) =>
                      setReactivationCode(event.target.value.replace(/\D/g, ""))
                    }
                    autoFocus
                  />
                  <button
                    type="button"
                    className="mt-2 text-[12px] font-medium text-zinc-400 hover:text-zinc-100"
                    onClick={sendReactivationCode}
                    disabled={reactivationLoading}
                  >
                    {t('auth.reactivate.resend')}
                  </button>
                </div>
              ) : null}
              {reactivationError ? (
                <p className="mt-3 text-[12px] leading-relaxed text-red-400">
                  {reactivationError}
                </p>
              ) : null}
            </div>
            <div className="border-t border-zinc-800">
              <button
                type="button"
                className={`h-12 w-full text-[15px] font-semibold text-white transition ${
                  reactivationLoading
                    ? "cursor-not-allowed bg-red-900"
                    : "bg-red-600 hover:bg-red-500"
                }`}
                onClick={
                  reactivationCodeSent ? confirmReactivation : sendReactivationCode
                }
                disabled={
                  reactivationLoading ||
                  (reactivationCodeSent && !canConfirmReactivation)
                }
              >
                {reactivationLoading
                  ? t('auth.processing')
                  : reactivationCodeSent
                    ? t('auth.reactivate.activate')
                    : t('auth.reactivate.sendOtp')}
              </button>
              <button
                type="button"
                className="h-12 w-full border-t border-zinc-800 text-[15px] font-medium text-zinc-200 hover:bg-zinc-900"
                onClick={closeReactivationModal}
              >
                {t('common.cancel')}
              </button>
            </div>
          </div>
        </div>
      ) : null}
      <div className="vibely-auth-card flex max-h-[94vh] w-full max-w-[520px] flex-col overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-950 shadow-2xl">
        <div className="min-h-0 flex-1 overflow-y-auto [scrollbar-gutter:stable] [scrollbar-width:thin] [scrollbar-color:#27272a_transparent] [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-zinc-800 [&::-webkit-scrollbar-track]:bg-zinc-950 [&::-webkit-scrollbar]:w-1.5">
        {view === "methods" ? (
          <>
            <div className="flex items-center justify-end gap-2 p-4">
              <Link
                to="/"
                className="vibely-auth-icon-btn flex h-10 w-10 items-center justify-center rounded-full bg-zinc-800 text-zinc-200 hover:bg-zinc-700"
                aria-label={t('common.close')}
              >
                <IoClose className="text-2xl" />
              </Link>
            </div>
            <div className="mx-auto w-full max-w-[380px] space-y-4 px-5 pb-7 text-sm">
              <h2 className="text-center text-3xl font-bold leading-tight">
                {t('auth.loginTitle')}
              </h2>
              <div className="mx-auto h-1 w-11/12 rounded-full bg-zinc-800" />

              <div className="space-y-3">
                <LoginMethodButton
                  label={t('auth.useEmail')}
                  recentlyUsed={lastLoginMethod === "email"}
                  onClick={() => {
                    setView("credentials");
                    setStatus("");
                  }}
                  icon={<FaUser className="text-xl text-zinc-100" aria-hidden />}
                />
                <LoginMethodButton
                  label={t('auth.continueWithGoogle')}
                  recentlyUsed={lastLoginMethod === "google"}
                  onClick={() => startOAuth("google")}
                  icon={<FcGoogle className="text-[28px]" aria-hidden />}
                />
                <LoginMethodButton
                  label={t('auth.continueWithFacebook')}
                  recentlyUsed={lastLoginMethod === "facebook"}
                  onClick={() => startOAuth("facebook")}
                  icon={
                    <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#1877F2]">
                      <FaFacebook className="text-[22px] text-white" aria-hidden />
                    </span>
                  }
                />
                <LoginMethodButton
                  label={t('auth.continueWithLine')}
                  recentlyUsed={lastLoginMethod === "line"}
                  onClick={() => startOAuth("line")}
                  icon={
                    <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#06C755]">
                      <SiLine className="text-[22px] text-white" aria-hidden />
                    </span>
                  }
                />
              </div>

              {(oauthErrorMessage || status) ? (
                <p className="text-center text-xs text-zinc-400">
                  {oauthErrorMessage || status}
                </p>
              ) : null}
            </div>
          </>
        ) : view === "credentials" ? (
          <>
            <div className="flex items-center justify-between p-4">
              <button
                type="button"
                onClick={() => {
                  setView("methods");
                  setStatus("");
                }}
                className="vibely-auth-icon-btn flex h-10 w-10 items-center justify-center rounded-full bg-zinc-800 text-zinc-200 hover:bg-zinc-700"
                aria-label={t('common.back')}
              >
                <IoArrowBack className="text-2xl" />
              </button>
              <div className="flex items-center gap-2">
                <Link
                  to="/"
                  className="vibely-auth-icon-btn flex h-10 w-10 items-center justify-center rounded-full bg-zinc-800 text-zinc-200 hover:bg-zinc-700"
                  aria-label={t('common.close')}
                >
                  <IoClose className="text-2xl" />
                </Link>
              </div>
            </div>
            <div className="mx-auto w-full max-w-[380px] space-y-3 px-5 pb-6 text-sm">
              <h2 className="text-center text-3xl font-bold leading-tight">
                {t('auth.loginShort')}
              </h2>
              <div className="text-[13px] font-medium text-zinc-100">
                {t('auth.emailOrId')}
              </div>
              <form className="space-y-2.5" onSubmit={submitWithCredentials}>
                <input
                  className={AUTH_FIELD}
                  placeholder={t('auth.emailOrId')}
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                />
                <div className="relative">
                  <input
                    className={AUTH_FIELD_WITH_ICON}
                    placeholder={t('auth.password')}
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                  <button
                    type="button"
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-2xl text-zinc-400 hover:text-zinc-200"
                    onClick={() => setShowPassword((prev) => !prev)}
                    aria-label={showPassword ? t('auth.hidePassword') : t('auth.showPassword')}
                  >
                    {showPassword ? <IoEyeOutline /> : <IoEyeOffOutline />}
                  </button>
                </div>
                <button
                  type="button"
                  className="text-[12px] text-zinc-200 hover:text-white"
                  onClick={openForgotPassword}
                >
                  {t('auth.forgotPassword')}
                </button>
                <button
                  className={`h-10 w-full rounded px-3 text-xl font-medium leading-none transition ${
                    canSubmit
                      ? "bg-red-600 text-white hover:bg-red-500"
                      : "cursor-not-allowed bg-zinc-800 text-zinc-400"
                  }`}
                  type="submit"
                  disabled={!canSubmit}
                >
                  {t('auth.loginShort')}
                </button>
              </form>
              {oauthErrorMessage || status ? (
                <p className="text-center text-xs text-zinc-400">
                  {oauthErrorMessage || status}
                </p>
              ) : null}
            </div>
          </>
        ) : (
          <>
            <div className="flex items-center justify-between p-4">
              <button
                type="button"
                onClick={() => {
                  setView("credentials");
                  setStatus("");
                  setSendResetError("");
                }}
                className="vibely-auth-icon-btn flex h-10 w-10 items-center justify-center rounded-full bg-zinc-800 text-zinc-200 hover:bg-zinc-700"
                aria-label={t('common.back')}
              >
                <IoArrowBack className="text-2xl" />
              </button>
              <div className="flex items-center gap-2">
                <Link
                  to="/"
                  className="vibely-auth-icon-btn flex h-10 w-10 items-center justify-center rounded-full bg-zinc-800 text-zinc-200 hover:bg-zinc-700"
                  aria-label={t('common.close')}
                >
                  <IoClose className="text-2xl" />
                </Link>
              </div>
            </div>
            <div className="mx-auto w-full max-w-[380px] space-y-3 px-5 pb-6 text-sm">
              <h2 className="text-center text-3xl font-bold leading-tight">
                {t('auth.resetPasswordTitle')}
              </h2>
              <div className="flex items-center justify-between gap-2">
                <span className="text-[13px] font-semibold text-zinc-100">
                  {t('auth.enterEmail')}
                </span>
                <button
                  type="button"
                  className="shrink-0 text-[12px] text-zinc-400 hover:text-zinc-200"
                  onClick={() =>
                    setStatus(t('auth.resetPhoneLater'))
                  }
                >
                  {t('auth.resetByPhone')}
                </button>
              </div>
              <form className="space-y-2.5" onSubmit={submitResetPassword}>
                <input
                  className={AUTH_FIELD}
                  placeholder={t('auth.emailPlaceholder')}
                  type="email"
                  autoComplete="email"
                  value={resetEmail}
                  onChange={(e) => setResetEmail(e.target.value)}
                />
                <div className="flex">
                  <input
                    className={AUTH_FIELD_OTP}
                    placeholder={t('auth.enterOtp')}
                    inputMode="numeric"
                    maxLength={6}
                    value={resetCode}
                    onChange={(e) =>
                      setResetCode(e.target.value.replace(/\D/g, ""))
                    }
                  />
                  <button
                    type="button"
                    className={`h-10 shrink-0 rounded-r px-4 text-[13px] transition ${
                      canSendResetCode
                        ? "bg-red-600 text-white hover:bg-red-500"
                        : "cursor-not-allowed bg-zinc-700 text-zinc-400"
                    }`}
                    onClick={handleSendResetCode}
                    disabled={!canSendResetCode || sendingResetCode}
                  >
                    {sendingResetCode
                      ? t('auth.sending')
                      : resendSeconds > 0
                        ? t('auth.resendCode', { seconds: resendSeconds })
                        : t('auth.sendCode')}
                  </button>
                </div>
                {sendResetError ? (
                  <p className="text-[12px] text-red-400">{sendResetError}</p>
                ) : null}
                <div className="relative">
                  <input
                    className={AUTH_FIELD_WITH_ICON}
                    placeholder={t('auth.password')}
                    type={showResetPassword ? "text" : "password"}
                    autoComplete="new-password"
                    value={resetPassword}
                    onChange={(e) => setResetPassword(e.target.value)}
                    onFocus={() => setIsResetPasswordFocused(true)}
                    onBlur={() => setIsResetPasswordFocused(false)}
                  />
                  <button
                    type="button"
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-2xl text-zinc-400 hover:text-zinc-200"
                    onClick={() => setShowResetPassword((prev) => !prev)}
                    aria-label={
                      showResetPassword ? t('auth.hidePassword') : t('auth.showPassword')
                    }
                  >
                    {showResetPassword ? <IoEyeOutline /> : <IoEyeOffOutline />}
                  </button>
                </div>
                {isResetPasswordFocused ? (
                  <div className="space-y-0.5 text-[12px] text-zinc-300">
                    <p className="font-medium text-zinc-200">
                      {t('auth.passwordRequirements')}
                    </p>
                    <p
                      className={`pl-3 ${
                        !hasResetPasswordInput
                          ? "text-zinc-400"
                          : resetPasswordHasValidLength
                            ? "text-emerald-400"
                            : "text-red-400"
                      }`}
                    >
                      {resetPasswordHasValidLength ? "✓" : "·"} {t('auth.passwordLength')}
                    </p>
                    <p
                      className={`pl-3 ${
                        !hasResetPasswordInput
                          ? "text-zinc-400"
                          : resetPasswordHasRequiredCharacters
                            ? "text-emerald-400"
                            : "text-red-400"
                      }`}
                    >
                      {resetPasswordHasRequiredCharacters ? "✓" : "·"} {t('auth.passwordChars')}
                    </p>
                  </div>
                ) : null}
                <button
                  className={`h-10 w-full rounded px-3 text-xl font-medium leading-none transition ${
                    canResetPassword
                      ? "bg-red-600 text-white hover:bg-red-500"
                      : "cursor-not-allowed bg-zinc-800 text-zinc-400"
                  }`}
                  type="submit"
                  disabled={!canResetPassword}
                >
                  {resetLoading ? t('auth.processing') : t('auth.resetPasswordTitle')}
                </button>
              </form>
              {status ? (
                <p className="text-center text-xs text-zinc-400">{status}</p>
              ) : null}
            </div>
          </>
        )}
        </div>
        <div className="rounded-b-2xl border-t border-zinc-800 bg-zinc-900/70 px-5 py-4 text-center">
          <p className="mx-auto max-w-[380px] text-[11px] leading-relaxed text-zinc-400">
            {t('auth.termsText')}{" "}
            <a
              className="text-zinc-200 underline hover:text-white"
              href="/legal/page/row/terms-of-service"
              target="_blank"
              rel="noreferrer"
            >
              {t('auth.termsLink')}
            </a>{" "}
            {t('auth.privacyText')}{" "}
            <a
              className="text-zinc-200 underline hover:text-white"
              href="/legal/page/row/privacy-policy"
              target="_blank"
              rel="noreferrer"
            >
              {t('auth.privacyLink')}
            </a>
            .
          </p>
          <p className="mt-3 text-[13px] text-zinc-300">
            {t('auth.noAccount')}{" "}
            <Link className="font-semibold text-red-500" to="/signup">
              {t('auth.signupLink')}
            </Link>
          </p>
        </div>
      </div>
    </section>
  );
}
