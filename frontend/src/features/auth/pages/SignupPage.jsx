import React, { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { FaFacebook, FaUser } from "react-icons/fa";
import { FcGoogle } from "react-icons/fc";
import { SiLine } from "react-icons/si";
import {
  IoAlertCircleOutline,
  IoArrowBack,
  IoClose,
  IoEyeOffOutline,
  IoEyeOutline,
} from "react-icons/io5";
import { apiClient } from "@/shared/api/client";
import { useAuth } from "@/features/auth/hooks/useAuth";

import { resolveBackendOrigin } from "@/shared/config/apiBase.js";
import {
  persistLastLoginMethod,
  useLastLoginMethod,
} from "@/features/auth/hooks/useLastLoginMethod.js";
import {
  AUTH_FIELD_AT,
  AUTH_FIELD_ERROR,
  AUTH_FIELD_OTP,
  AUTH_FIELD_WITH_ICON,
} from "@/features/auth/components/authFieldClasses.js";
import { BirthDateFields } from "@/features/auth/components/BirthDateSelect.jsx";
import { validateBirthDateParts } from "@/features/auth/utils/birthDate.js";
import { localizeUsernameCheckMessage } from "@/features/auth/utils/localizeUsernameCheckMessage.js";
import {
  buildOnboardingPendingFromUser,
  clearOnboardingSession,
  isPendingUsername,
  OAUTH_ONBOARDING_KEY,
  OAUTH_ONBOARDING_STEP_KEY,
  persistOnboardingPending,
  userNeedsOnboarding,
} from "@/features/auth/utils/onboarding.js";
import { LoginMethodButton } from "@/features/auth/components/LoginMethodButton.jsx";
import { GuestAuthCloseButton, useGuestAuthUi } from "@/features/auth/store/GuestAuthUiContext.jsx";
import { ChallengeModal } from "@/security/captcha/ChallengeModal.jsx";
import {
  buildAntiBotHeaders,
  CAPTCHA_VERIFICATION_HEADER,
} from "@/security/headers/buildAntiBotHeaders.js";
import { useAntiBot } from "@/security/hooks/useAntiBot.js";
import { clearVerificationToken } from "@/security/sdk/antiBotClient.js";

function normalizeVibelyId(value) {
  return value.trim().toLowerCase().replace(/^@+/, "");
}

export function SignupPage({ asModal = false }) {
  const { register, refreshProfile, user, token } = useAuth();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const guestAuthUi = useGuestAuthUi();
  const [searchParams] = useSearchParams();
  const [view, setView] = useState("methods");
  const [oauthPending, setOauthPending] = useState(null);
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [vibelyId, setVibelyId] = useState("");
  const [birthMonth, setBirthMonth] = useState("");
  const [birthDay, setBirthDay] = useState("");
  const [birthYear, setBirthYear] = useState("");
  const [verificationCode, setVerificationCode] = useState("");
  const [acceptMarketing, setAcceptMarketing] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [emailTouched, setEmailTouched] = useState(false);
  const [isEmailFocused, setIsEmailFocused] = useState(false);
  const [isPasswordFocused, setIsPasswordFocused] = useState(false);
  const [sendCodeError, setSendCodeError] = useState("");
  const [sendingCode, setSendingCode] = useState(false);
  const pendingCaptchaActionRef = useRef(null);
  const [usernameChecking, setUsernameChecking] = useState(false);
  const [usernameAvailable, setUsernameAvailable] = useState(false);
  const [usernameSuggestion, setUsernameSuggestion] = useState("");
  const [usernameMessage, setUsernameMessage] = useState("");
  const [usernameCanRecheck, setUsernameCanRecheck] = useState(false);
  const [emailChecking, setEmailChecking] = useState(false);
  const [emailAvailable, setEmailAvailable] = useState(false);
  const [emailMessage, setEmailMessage] = useState("");
  const [emailCanRecheck, setEmailCanRecheck] = useState(false);
  const [otpVerified, setOtpVerified] = useState(false);
  const [verifiedCodeSnapshot, setVerifiedCodeSnapshot] = useState("");
  const [verifiedEmailSnapshot, setVerifiedEmailSnapshot] = useState("");
  const [resendSeconds, setResendSeconds] = useState(0);
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
  } = useAntiBot("register");
  const normalizedEmail = identifier.trim();
  const isEmailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail);
  const showEmailError =
    emailTouched &&
    !isEmailFocused &&
    normalizedEmail.length > 0 &&
    !isEmailValid;
  const normalizedVibelyId = normalizeVibelyId(vibelyId);

  useEffect(() => {
    document.title = `${t('auth.signupShort')} | Vibely`;
  }, [t]);

  useEffect(() => {
    const isOAuthOnboarding = searchParams.get("onboarding") === "oauth";
    const fromAuth = Boolean(token && user && userNeedsOnboarding(user));

    if (!isOAuthOnboarding && !fromAuth) return;

    if (fromAuth && !isOAuthOnboarding) {
      navigate("/signup?onboarding=oauth", { replace: true });
      return;
    }

    let pending = null;
    const raw = sessionStorage.getItem(OAUTH_ONBOARDING_KEY);
    if (raw) {
      try {
        pending = JSON.parse(raw);
      } catch {
        pending = null;
      }
    }

    if ((!pending?.userId && !pending?.email) && fromAuth) {
      pending = buildOnboardingPendingFromUser(user);
      persistOnboardingPending(pending);
    }

    if (!pending?.userId && !pending?.email) {
      navigate("/login", { replace: true });
      return;
    }

    setOauthPending(pending);

    const storedStep = sessionStorage.getItem(OAUTH_ONBOARDING_STEP_KEY);
    const usernameNeedsSelection = isPendingUsername(
      pending?.username ?? user?.username,
    );
    if (storedStep === "username" && usernameNeedsSelection) {
      setView("oauth-username");
    } else {
      setView("oauth-birth");
    }
  }, [navigate, searchParams, token, user]);

  const birthDateValidation = validateBirthDateParts(
    birthMonth,
    birthDay,
    birthYear,
  );
  const isBirthDateValid = birthDateValidation.valid;

  const canContinueToUsername =
    birthMonth &&
    birthDay &&
    birthYear &&
    isBirthDateValid &&
    normalizedEmail.length > 0 &&
    isEmailValid &&
    password.trim().length > 0 &&
    verificationCode.trim().length === 6 &&
    !sendingCode &&
    !loading;
  const canSubmitUsername =
    otpVerified &&
    normalizedVibelyId.length > 0 &&
    usernameAvailable &&
    !usernameChecking &&
    !loading;
  const canContinueOAuthBirth = Boolean(
    birthMonth && birthDay && birthYear && isBirthDateValid && !loading,
  );
  const canSubmitOAuthUsername =
    normalizedVibelyId.length > 0 &&
    usernameAvailable &&
    !usernameChecking &&
    !loading &&
    Boolean(oauthPending?.userId || oauthPending?.email);
  const passwordHasValidLength = password.length >= 8 && password.length <= 20;
  const passwordHasRequiredCharacters =
    /[A-Za-z]/.test(password) &&
    /\d/.test(password) &&
    /[^A-Za-z0-9]/.test(password);
  const hasPasswordInput = password.length > 0;
  const isPasswordValid =
    passwordHasValidLength && passwordHasRequiredCharacters;
  const canSendVerificationCode =
    birthMonth &&
    birthDay &&
    birthYear &&
    isBirthDateValid &&
    normalizedEmail.length > 0 &&
    isEmailValid &&
    emailAvailable &&
    !emailChecking &&
    isPasswordValid &&
    !sendingCode &&
    !loading &&
    resendSeconds === 0;
  const monthOptions = [1,2,3,4,5,6,7,8,9,10,11,12].map((m) => t(`months.${m}`));
  useEffect(() => {
    if (resendSeconds <= 0) {
      return undefined;
    }

    const timer = setInterval(() => {
      setResendSeconds((previous) => (previous > 1 ? previous - 1 : 0));
    }, 1000);

    return () => clearInterval(timer);
  }, [resendSeconds]);

  useEffect(() => {
    if (view !== "username" && view !== "oauth-username") return undefined;
    if (!normalizedVibelyId) {
      return undefined;
    }

    const timeoutId = setTimeout(() => {
      apiClient
        .checkUsername(normalizedVibelyId)
        .then((result) => {
          setUsernameAvailable(Boolean(result?.available));
          setUsernameSuggestion(result?.suggestion ?? "");
          setUsernameMessage(result?.message ?? "");
          setUsernameCanRecheck(Boolean(result?.canRecheck));
        })
        .catch((error) => {
          setUsernameAvailable(false);
          setUsernameSuggestion("");
          setUsernameMessage(error.message);
          setUsernameCanRecheck(false);
        })
        .finally(() => setUsernameChecking(false));
    }, 350);

    return () => clearTimeout(timeoutId);
  }, [normalizedVibelyId, view]);

  useEffect(() => {
    if (view !== "credentials" || !isEmailValid) {
      setEmailAvailable(false);
      setEmailMessage("");
      setEmailChecking(false);
      return undefined;
    }

    setEmailChecking(true);
    const timeoutId = setTimeout(() => {
      apiClient
        .checkEmail(normalizedEmail)
        .then((result) => {
          setEmailAvailable(Boolean(result?.available));
          setEmailMessage(result?.message ?? "");
          setEmailCanRecheck(Boolean(result?.canRecheck));
        })
        .catch((error) => {
          setEmailAvailable(false);
          setEmailMessage(error.message);
          setEmailCanRecheck(false);
        })
        .finally(() => setEmailChecking(false));
    }, 350);

    return () => clearTimeout(timeoutId);
  }, [isEmailValid, normalizedEmail, view]);

  const recheckEmailAvailability = async () => {
    if (!isEmailValid) return;
    setEmailChecking(true);
    setEmailCanRecheck(false);
    try {
      const result = await apiClient.checkEmail(normalizedEmail, { confirm: true });
      setEmailAvailable(Boolean(result?.available));
      setEmailMessage(result?.message ?? "");
      setEmailCanRecheck(Boolean(result?.canRecheck));
    } catch (error) {
      setEmailAvailable(false);
      setEmailMessage(error.message);
      setEmailCanRecheck(false);
    } finally {
      setEmailChecking(false);
    }
  };

  const recheckUsernameAvailability = async () => {
    if (!normalizedVibelyId) return;
    setUsernameChecking(true);
    setUsernameCanRecheck(false);
    try {
      const result = await apiClient.checkUsername(normalizedVibelyId, { confirm: true });
      setUsernameAvailable(Boolean(result?.available));
      setUsernameSuggestion(result?.suggestion ?? "");
      setUsernameMessage(result?.message ?? "");
      setUsernameCanRecheck(Boolean(result?.canRecheck));
    } catch (error) {
      setUsernameAvailable(false);
      setUsernameSuggestion("");
      setUsernameMessage(error.message);
      setUsernameCanRecheck(false);
    } finally {
      setUsernameChecking(false);
    }
  };

  const buildSuggestedUsername = (emailSource = normalizedEmail) => {
    const fromEmail = normalizeVibelyId(String(emailSource).split("@")[0] ?? "")
      .replace(/[^a-z0-9._]/g, ".")
      .replace(/\.+/g, ".")
      .replace(/^\.+|\.+$/g, "")
      .slice(0, 24);
    if (fromEmail.length >= 4) return fromEmail;
    return "vibely.user";
  };

  const continueOAuthBirthStep = (event) => {
    event.preventDefault();
    const birthCheck = validateBirthDateParts(birthMonth, birthDay, birthYear);
    if (!birthCheck.valid) {
      setStatus(birthCheck.message);
      return;
    }
    const existingUsername = normalizeVibelyId(
      oauthPending?.username ?? user?.username ?? "",
    );
    if (existingUsername && !isPendingUsername(existingUsername)) {
      void finishOAuthOnboarding(existingUsername);
      return;
    }
    const suggestion = buildSuggestedUsername(oauthPending?.email ?? "");
    setUsernameChecking(true);
    setVibelyId(suggestion);
    sessionStorage.setItem(OAUTH_ONBOARDING_STEP_KEY, "username");
    setView("oauth-username");
    setStatus(t('auth.chooseVibelyId'));
  };

  const finishOAuthOnboarding = async (usernameToSubmit) => {
    if (!oauthPending?.userId && !oauthPending?.email) {
      setStatus(t('auth.sessionExpired'));
      navigate("/login", { replace: true });
      return;
    }
    const normalizedUsername = normalizeVibelyId(usernameToSubmit);
    if (!normalizedUsername) {
      setStatus(t('auth.enterVibelyId'));
      return;
    }
    if (isPendingUsername(normalizedUsername)) {
      if (!usernameAvailable) {
        const suggestionText = usernameSuggestion
          ? t('auth.vibelyIdSuggestion', { suggestion: usernameSuggestion })
          : "";
        setStatus(t('auth.vibelyIdInvalid', { suggestion: suggestionText }));
        return;
      }
    }
    if (!birthMonth || !birthDay || !birthYear) {
      setStatus(t('auth.chooseBirthDate'));
      setView("oauth-birth");
      return;
    }
    const birthCheck = validateBirthDateParts(birthMonth, birthDay, birthYear);
    if (!birthCheck.valid) {
      setStatus(birthCheck.message);
      setView("oauth-birth");
      return;
    }

    const birthDate = `${birthYear}-${String(birthMonth).padStart(2, "0")}-${String(birthDay).padStart(2, "0")}`;

    setLoading(true);
    setStatus(t('auth.completingSignup'));
    try {
      // Cookie có thể thuộc tài khoản cũ (apex vs www) — khớp email trước khi lưu.
      const me = await apiClient.me();
      const sessionEmail = String(me?.email ?? "").trim().toLowerCase();
      const pendingEmail = String(oauthPending?.email ?? "").trim().toLowerCase();
      if (pendingEmail && sessionEmail && sessionEmail !== pendingEmail) {
        clearOnboardingSession();
        try {
          await apiClient.logout();
        } catch {
          /* ignore */
        }
        setStatus(
          t('auth.lineSessionMismatch'),
        );
        navigate("/login", { replace: true });
        return;
      }
      if (pendingEmail && !sessionEmail) {
        setStatus(t('auth.noLoginSession'));
        navigate("/login", { replace: true });
        return;
      }

      await apiClient.completeOnboarding({
        username: normalizedUsername,
        birthDate,
      });
      clearOnboardingSession();
      const provider = oauthPending?.provider;
      if (provider) {
        persistLastLoginMethod(provider);
      }
      await refreshProfile();
      setStatus(t('auth.signupSuccess'));
      navigate("/", { replace: true });
    } catch (error) {
      const message = String(error?.message ?? "");
      if (message.includes("hoàn tất thiết lập")) {
        clearOnboardingSession();
        try {
          await refreshProfile();
        } catch {
          /* ignore */
        }
        navigate("/", { replace: true });
        return;
      }
      setStatus(message || t('auth.sessionExpired'));
    } finally {
      setLoading(false);
    }
  };

  const submitOAuthOnboarding = async (event) => {
    event.preventDefault();
    if (!normalizedVibelyId) {
      setStatus(t('auth.enterVibelyId'));
      return;
    }
    if (!usernameAvailable) {
      const suggestionText = usernameSuggestion
        ? t('auth.vibelyIdSuggestion', { suggestion: usernameSuggestion })
        : "";
      setStatus(t('auth.vibelyIdInvalid', { suggestion: suggestionText }));
      return;
    }
    await finishOAuthOnboarding(normalizedVibelyId);
  };

  const doSendVerificationCode = async () => {
    setSendingCode(true);
    setSendCodeError("");
    try {
      const headers = buildAntiBotHeaders();
      const result = await apiClient.sendCode(
        {
          email: normalizedEmail,
          purpose: "REGISTER",
          challengePassed: !headers[CAPTCHA_VERIFICATION_HEADER],
        },
        headers,
      );
      const cooldown = Number(result?.resendAfterSeconds) || 60;
      setResendSeconds(cooldown);
      setVerifiedCodeSnapshot("");
      setVerifiedEmailSnapshot("");
      if (result?.emailSent) {
        setStatus(
          t('auth.otpSent', { email: normalizedEmail }),
        );
      } else if (result?.demoCode) {
        setStatus(
          t('auth.otpDemo', { code: result.demoCode }),
        );
      } else {
        setStatus(
          t('auth.otpSendFailed'),
        );
      }
    } catch (error) {
      setSendCodeError(error.message);
    } finally {
      setSendingCode(false);
    }
  };

  const handleSendVerificationCode = async () => {
    if (!canSendVerificationCode) return;
    pendingCaptchaActionRef.current = "sendCode";
    setSendCodeError("");
    try {
      const human = await ensureHuman();
      if (human.verified) {
        pendingCaptchaActionRef.current = null;
        await doSendVerificationCode();
      }
    } catch (error) {
      pendingCaptchaActionRef.current = null;
      setSendCodeError(error.message);
    }
  };

  const startOAuth = (provider) => {
    let origin = resolveBackendOrigin();
    try {
      const url = new URL(origin);
      if (url.hostname === "vibely.sbs") {
        url.hostname = "www.vibely.sbs";
        origin = url.origin;
      }
    } catch {
      // keep resolveBackendOrigin()
    }
    window.location.href = `${origin}/api/oauth2/authorization/${provider}`;
  };

  const continueToUsernameStep = async (event) => {
    event.preventDefault();
    setEmailTouched(true);
    if (
      !birthMonth ||
      !birthDay ||
      !birthYear ||
      !identifier.trim() ||
      !password.trim() ||
      verificationCode.trim().length !== 6
    ) {
      setStatus(t('auth.fillAllFields'));
      return;
    }
    const birthCheck = validateBirthDateParts(birthMonth, birthDay, birthYear);
    if (!birthCheck.valid) {
      setStatus(birthCheck.message);
      return;
    }
    if (!isEmailValid) {
      setStatus(t('auth.enterValidEmailSignup'));
      return;
    }
    if (!emailAvailable) {
      setStatus(emailMessage || t('auth.emailUsedOrInvalid'));
      return;
    }

    const normalizedCode = verificationCode.trim();
    const codeAlreadyVerified =
      verifiedCodeSnapshot === normalizedCode &&
      verifiedEmailSnapshot === normalizedEmail;
    if (!codeAlreadyVerified) {
      try {
        await apiClient.verifyCode({
          email: normalizedEmail,
          code: normalizedCode,
          purpose: "REGISTER",
        });
        setVerifiedCodeSnapshot(normalizedCode);
        setVerifiedEmailSnapshot(normalizedEmail);
      } catch (error) {
        setStatus(error.message);
        return;
      }
    }

    setOtpVerified(true);
    const suggestion = buildSuggestedUsername();
    setUsernameChecking(true);
    setVibelyId(suggestion);
    setView("username");
    setStatus(t('auth.otpValidChooseId'));
  };

  const submitRegisterWithUsername = async (event) => {
    event.preventDefault();
    if (!otpVerified) {
      setStatus(t('auth.completeOtpFirst'));
      return;
    }
    if (!normalizedVibelyId) {
      setStatus(t('auth.enterVibelyId'));
      return;
    }
    if (!usernameAvailable) {
      const suggestionText = usernameSuggestion
        ? t('auth.vibelyIdSuggestion', { suggestion: usernameSuggestion })
        : "";
      setStatus(t('auth.vibelyIdInvalid', { suggestion: suggestionText }));
      return;
    }

    if (!birthMonth || !birthDay || !birthYear) {
      setStatus(t('auth.chooseBirthDate'));
      setView("credentials");
      return;
    }
    const birthCheck = validateBirthDateParts(birthMonth, birthDay, birthYear);
    if (!birthCheck.valid) {
      setStatus(birthCheck.message);
      setView("credentials");
      return;
    }

    const birthDate = `${birthYear}-${String(birthMonth).padStart(2, "0")}-${String(birthDay).padStart(2, "0")}`;

    setLoading(true);
    setStatus(t('auth.creatingAccount'));
    try {
      pendingCaptchaActionRef.current = "register";
      const human = await ensureHuman();
      if (!human.verified) {
        setStatus(t('auth.completeCaptcha'));
        setLoading(false);
        return;
      }
      pendingCaptchaActionRef.current = null;
      await register(
        {
          username: normalizedVibelyId,
          displayName: normalizedVibelyId,
          email: normalizedEmail,
          password,
          bio: "",
          birthDate,
        },
        buildAntiBotHeaders(),
      );
      clearVerificationToken();
      setStatus(t('auth.signupSuccess'));
    } catch (error) {
      if (error.status === 428 && error.captchaRequired) {
        handleCaptchaRequired(error.captchaRequired);
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

  return (
    <section
      className={
        asModal
          ? "vibely-auth-page vibely-auth-modal-scrim fixed inset-0 z-[240] flex items-center justify-center overflow-y-auto bg-black/45 px-4 py-6 text-zinc-100"
          : "vibely-auth-page relative flex min-h-screen items-center justify-center overflow-hidden bg-black/70 px-4 py-6 text-zinc-100"
      }
    >
      <ChallengeModal
        open={challengeOpen}
        challengeLevel={challengeLevel}
        purpose="REGISTER"
        onClose={closeChallenge}
        onVerified={() => {
          onChallengeVerified();
          const action = pendingCaptchaActionRef.current;
          pendingCaptchaActionRef.current = null;
          if (action === "sendCode") {
            void doSendVerificationCode();
          } else if (action === "register") {
            submitRegisterWithUsername({ preventDefault: () => {} });
          }
        }}
      />
      <div className="vibely-auth-card flex max-h-[94vh] w-full max-w-[520px] flex-col overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-950 shadow-2xl">
        <div className="min-h-0 flex-1 overflow-y-auto [scrollbar-gutter:stable] [scrollbar-width:thin] [scrollbar-color:#27272a_transparent] [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-zinc-800 [&::-webkit-scrollbar-track]:bg-zinc-950 [&::-webkit-scrollbar]:w-1.5">
          {view === "methods" ? (
            <>
              <div className="flex items-center justify-end gap-2 p-4">
                <GuestAuthCloseButton asModal={asModal} aria-label={t('common.close')}>
                  <IoClose className="text-2xl" />
                </GuestAuthCloseButton>
              </div>
              <div className="mx-auto w-full max-w-[380px] space-y-4 px-5 pb-7 text-sm">
                <h2 className="text-center text-3xl font-bold leading-tight">
                  {t('auth.signupTitle')}
                </h2>
                <div className="mx-auto h-1 w-11/12 rounded-full bg-zinc-800" />

                <div className="space-y-3">
                  <LoginMethodButton
                    label={t('auth.useEmailOnly')}
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

                {status ? (
                  <p className="text-center text-xs text-zinc-400">{status}</p>
                ) : null}
              </div>
            </>
          ) : view === "credentials" ? (
            <>
              <div className="flex items-center justify-between p-4">
                <button
                  type="button"
                  onClick={() => setView("methods")}
                  className="vibely-auth-icon-btn flex h-10 w-10 items-center justify-center rounded-full bg-zinc-800 text-zinc-200 hover:bg-zinc-700"
                  aria-label={t('common.back')}
                >
                  <IoArrowBack className="text-2xl" />
                </button>
                <div className="flex items-center gap-2">
                  <GuestAuthCloseButton asModal={asModal} aria-label={t('common.close')}>
                    <IoClose className="text-2xl" />
                  </GuestAuthCloseButton>
                </div>
              </div>
              <div className="mx-auto w-full max-w-[380px] space-y-3 px-5 pb-6 text-sm">
                <h2 className="text-center text-3xl font-bold leading-tight">
                  {t('auth.signupShort')}
                </h2>
                <p className="text-[13px] text-zinc-100">
                  {t('auth.birthDate')}
                </p>
                <form className="space-y-2.5" onSubmit={continueToUsernameStep}>
                  <BirthDateFields
                    birthMonth={birthMonth}
                    birthDay={birthDay}
                    birthYear={birthYear}
                    onMonthChange={setBirthMonth}
                    onDayChange={setBirthDay}
                    onYearChange={setBirthYear}
                    monthOptions={monthOptions}
                  />

                  {!isBirthDateValid &&
                  birthMonth &&
                  birthDay &&
                  birthYear ? (
                    <p className="text-[12px] text-red-400">
                      {birthDateValidation.message}
                    </p>
                  ) : null}
                  <p className="text-[12px] text-zinc-500">
                    {t('auth.birthPrivate')}
                  </p>
                  <div className="flex items-center justify-between">
                    <span className="text-[13px] font-semibold text-zinc-100">
                      Email
                    </span>
                    <button
                      type="button"
                      className="text-[12px] text-zinc-100 hover:text-zinc-300"
                    >
                      {t('auth.registerByPhone')}
                    </button>
                  </div>
                  <div className="relative">
                    <input
                      className={
                        showEmailError ? AUTH_FIELD_ERROR : AUTH_FIELD_WITH_ICON
                      }
                      placeholder={t('auth.emailPlaceholder')}
                      value={identifier}
                      onChange={(e) => {
                        setIdentifier(e.target.value);
                        setVerifiedCodeSnapshot("");
                        setVerifiedEmailSnapshot("");
                      }}
                      onFocus={() => setIsEmailFocused(true)}
                      onBlur={() => {
                        setIsEmailFocused(false);
                        setEmailTouched(true);
                      }}
                    />
                    {showEmailError ? (
                      <IoAlertCircleOutline className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-xl text-red-500" />
                    ) : null}
                  </div>
                  {showEmailError ? (
                    <p className="text-[12px] text-red-500">
                      {t('auth.emailInvalid')}
                    </p>
                  ) : null}
                  {isEmailValid ? (
                    <p
                      className={`text-[12px] ${
                        emailAvailable ? "text-emerald-400" : "text-amber-400"
                      }`}
                    >
                      {emailChecking
                        ? t('auth.checkingEmail')
                        : emailMessage || " "}
                    </p>
                  ) : null}
                  {emailCanRecheck && !emailChecking ? (
                    <button
                      type="button"
                      className="text-[12px] text-zinc-300 underline hover:text-white"
                      onClick={() => void recheckEmailAvailability()}
                    >
                      {t('auth.emailRecheck')}
                    </button>
                  ) : null}
                  <div className="relative">
                    <input
                      className={AUTH_FIELD_WITH_ICON}
                      placeholder={t('auth.password')}
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      onFocus={() => setIsPasswordFocused(true)}
                      onBlur={() => setIsPasswordFocused(false)}
                    />
                    <button
                      type="button"
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-2xl text-zinc-400 hover:text-zinc-200"
                      onMouseDown={(event) => event.preventDefault()}
                      onClick={() => {
                        setShowPassword((prev) => !prev);
                        setIsPasswordFocused(true);
                      }}
                      aria-label={
                        showPassword ? t('auth.hidePassword') : t('auth.showPassword')
                      }
                    >
                      {showPassword ? <IoEyeOutline /> : <IoEyeOffOutline />}
                    </button>
                  </div>
                  {isPasswordFocused ? (
                    <div className="space-y-0.5 text-[12px] text-zinc-300">
                      <p className="font-medium text-zinc-200">
                        {t('auth.passwordRequirements')}
                      </p>
                      <p
                        className={`pl-3 ${
                          !hasPasswordInput
                            ? "text-zinc-400"
                            : passwordHasValidLength
                              ? "text-emerald-400"
                              : "text-red-400"
                        }`}
                      >
                        {passwordHasValidLength ? "✓" : "·"} {t('auth.passwordLength')}
                      </p>
                      <p
                        className={`pl-3 ${
                          !hasPasswordInput
                            ? "text-zinc-400"
                            : passwordHasRequiredCharacters
                              ? "text-emerald-400"
                              : "text-red-400"
                        }`}
                      >
                        {passwordHasRequiredCharacters ? "✓" : "·"} {t('auth.passwordChars')}
                      </p>
                    </div>
                  ) : null}
                  <div className="flex">
                    <input
                      className={AUTH_FIELD_OTP}
                      placeholder={t('auth.enterOtp')}
                      value={verificationCode}
                      maxLength={6}
                      onChange={(e) => {
                        const nextCode = e.target.value.replace(/\D/g, "");
                        setVerificationCode(nextCode);
                        setVerifiedCodeSnapshot("");
                      }}
                    />
                    <button
                      type="button"
                      className={`h-10 rounded-r px-4 text-[13px] transition ${
                        canSendVerificationCode
                          ? "bg-red-600 text-white hover:bg-red-500"
                          : "cursor-not-allowed bg-zinc-700 text-zinc-400"
                      }`}
                      onClick={handleSendVerificationCode}
                      disabled={!canSendVerificationCode || sendingCode}
                    >
                      {sendingCode
                        ? t('auth.sending')
                        : resendSeconds > 0
                          ? t('auth.resendCode', { seconds: resendSeconds })
                          : t('auth.sendCode')}
                    </button>
                  </div>
                  {sendCodeError ? (
                    <p className="text-sm text-red-400">{sendCodeError}</p>
                  ) : null}
                  <label className="flex items-start gap-2 text-[12px] leading-4 text-zinc-300">
                    <input
                      type="checkbox"
                      className="mt-0.5 h-4 w-4 rounded border-zinc-600 bg-zinc-900"
                      checked={acceptMarketing}
                      onChange={(e) => setAcceptMarketing(e.target.checked)}
                    />
                    <span>
                      {t('auth.marketing')}
                    </span>
                  </label>
                  <button
                    className={`h-10 w-full rounded px-3 text-xl font-medium leading-none transition ${
                      canContinueToUsername
                        ? "bg-red-600 text-white hover:bg-red-500"
                        : "cursor-not-allowed bg-zinc-800 text-zinc-400"
                    }`}
                    type="submit"
                    disabled={!canContinueToUsername}
                  >
                    {t('auth.next')}
                  </button>
                </form>
                {status ? (
                  <p className="text-center text-xs text-zinc-400">{status}</p>
                ) : null}
              </div>
            </>
          ) : view === "oauth-birth" ? (
            <>
              <div className="mx-auto w-full max-w-[380px] space-y-3 px-5 pb-6 pt-6 text-sm">
                <h2 className="text-center text-3xl font-bold leading-tight">
                  {t('auth.signupShort')}
                </h2>
                <p className="text-[13px] text-zinc-100">
                  {t('auth.birthDate')}
                </p>
                <form className="space-y-2.5" onSubmit={continueOAuthBirthStep}>
                  <BirthDateFields
                    birthMonth={birthMonth}
                    birthDay={birthDay}
                    birthYear={birthYear}
                    onMonthChange={setBirthMonth}
                    onDayChange={setBirthDay}
                    onYearChange={setBirthYear}
                    monthOptions={monthOptions}
                  />
                  {!isBirthDateValid &&
                  birthMonth &&
                  birthDay &&
                  birthYear ? (
                    <p className="text-[12px] text-red-400">
                      {birthDateValidation.message}
                    </p>
                  ) : null}
                  <p className="text-[12px] text-zinc-500">
                    {t('auth.birthPrivate')}
                  </p>
                  <button
                    className={`h-10 w-full rounded px-3 text-xl font-medium leading-none transition ${
                      canContinueOAuthBirth
                        ? "bg-red-600 text-white hover:bg-red-500"
                        : "cursor-not-allowed bg-zinc-800 text-zinc-400"
                    }`}
                    type="submit"
                    disabled={!canContinueOAuthBirth}
                  >
                    {t('auth.next')}
                  </button>
                </form>
                {status ? (
                  <p className="text-center text-xs text-zinc-400">{status}</p>
                ) : null}
              </div>
            </>
          ) : view === "oauth-username" ? (
            <>
              <div className="flex items-center justify-between p-4">
                <button
                  type="button"
                  onClick={() => {
                    sessionStorage.removeItem(OAUTH_ONBOARDING_STEP_KEY);
                    setView("oauth-birth");
                  }}
                  className="vibely-auth-icon-btn flex h-10 w-10 items-center justify-center rounded-full bg-zinc-800 text-zinc-200 hover:bg-zinc-700"
                  aria-label={t('common.back')}
                >
                  <IoArrowBack className="text-2xl" />
                </button>
              </div>
              <div className="mx-auto w-full max-w-[380px] space-y-3 px-5 pb-6 text-sm">
                <h2 className="text-center text-3xl font-bold leading-tight">
                  {t('auth.signupShort')}
                </h2>
                <p className="text-[13px] text-zinc-100">{t('auth.createVibelyId')}</p>
                <form
                  className="space-y-2.5"
                  onSubmit={submitOAuthOnboarding}
                >
                  <div className="relative">
                    <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[13px] text-zinc-400">
                      @
                    </span>
                    <input
                      className={AUTH_FIELD_AT}
                      placeholder={t("auth.vibelyIdPlaceholder")}
                      value={vibelyId}
                      onChange={(event) => {
                        const nextValue = event.target.value;
                        setVibelyId(nextValue);
                        setUsernameChecking(
                          normalizeVibelyId(nextValue).length > 0,
                        );
                        setUsernameAvailable(false);
                        setUsernameSuggestion("");
                        setUsernameMessage("");
                        setUsernameCanRecheck(false);
                      }}
                    />
                  </div>
                  <p
                    className={`text-[12px] ${
                      usernameChecking
                        ? "text-zinc-400"
                        : usernameAvailable
                          ? "text-emerald-400"
                          : "text-zinc-500"
                    }`}
                  >
                    {usernameChecking
                      ? t('auth.vibelyIdChecking')
                      : normalizedVibelyId
                        ? localizeUsernameCheckMessage(usernameMessage) ||
                          t("auth.vibelyIdHint")
                        : t('auth.vibelyIdEnter')}
                  </p>
                  {usernameCanRecheck && !usernameChecking ? (
                    <button
                      type="button"
                      className="text-[12px] text-zinc-300 underline hover:text-white"
                      onClick={() => void recheckUsernameAvailability()}
                    >
                      {t('auth.vibelyIdRecheck')}
                    </button>
                  ) : null}
                  {usernameSuggestion && !usernameAvailable ? (
                    <button
                      type="button"
                      className="text-[12px] text-zinc-300 underline hover:text-white"
                      onClick={() => {
                        setUsernameChecking(true);
                        setVibelyId(usernameSuggestion);
                      }}
                    >
                      {t('auth.useSuggestion', { suggestion: usernameSuggestion })}
                    </button>
                  ) : null}
                  <button
                    className={`h-10 w-full rounded px-3 text-xl font-medium leading-none transition ${
                      canSubmitOAuthUsername
                        ? "bg-red-600 text-white hover:bg-red-500"
                        : "cursor-not-allowed bg-zinc-800 text-zinc-400"
                    }`}
                    type="submit"
                    disabled={!canSubmitOAuthUsername}
                  >
                    {t('auth.done')}
                  </button>
                </form>
                {status ? (
                  <p className="text-center text-xs text-zinc-400">{status}</p>
                ) : null}
              </div>
            </>
          ) : view === "username" ? (
            <>
              <div className="flex items-center justify-between p-4">
                <button
                  type="button"
                  onClick={() => setView("credentials")}
                  className="vibely-auth-icon-btn flex h-10 w-10 items-center justify-center rounded-full bg-zinc-800 text-zinc-200 hover:bg-zinc-700"
                  aria-label={t('common.back')}
                >
                  <IoArrowBack className="text-2xl" />
                </button>
                <div className="flex items-center gap-2">
                  <GuestAuthCloseButton asModal={asModal} aria-label={t('common.close')}>
                    <IoClose className="text-2xl" />
                  </GuestAuthCloseButton>
                </div>
              </div>
              <div className="mx-auto w-full max-w-[380px] space-y-3 px-5 pb-6 text-sm">
                <h2 className="text-center text-3xl font-bold leading-tight">
                  {t('auth.signupShort')}
                </h2>
                <p className="text-[13px] text-zinc-100">{t('auth.createVibelyId')}</p>
                <form
                  className="space-y-2.5"
                  onSubmit={submitRegisterWithUsername}
                >
                  <div className="relative">
                    <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[13px] text-zinc-400">
                      @
                    </span>
                    <input
                      className={AUTH_FIELD_AT}
                      placeholder={t("auth.vibelyIdPlaceholder")}
                      value={vibelyId}
                      onChange={(event) => {
                        const nextValue = event.target.value;
                        setVibelyId(nextValue);
                        setUsernameChecking(
                          normalizeVibelyId(nextValue).length > 0,
                        );
                        setUsernameAvailable(false);
                        setUsernameSuggestion("");
                        setUsernameMessage("");
                        setUsernameCanRecheck(false);
                      }}
                    />
                  </div>
                  <p
                    className={`text-[12px] ${
                      usernameChecking
                        ? "text-zinc-400"
                        : usernameAvailable
                          ? "text-emerald-400"
                          : "text-zinc-500"
                    }`}
                  >
                    {usernameChecking
                      ? t('auth.vibelyIdChecking')
                      : normalizedVibelyId
                        ? localizeUsernameCheckMessage(usernameMessage) ||
                          t("auth.vibelyIdHint")
                        : t('auth.vibelyIdEnter')}
                  </p>
                  {usernameCanRecheck && !usernameChecking ? (
                    <button
                      type="button"
                      className="text-[12px] text-zinc-300 underline hover:text-white"
                      onClick={() => void recheckUsernameAvailability()}
                    >
                      {t('auth.vibelyIdRecheck')}
                    </button>
                  ) : null}
                  {usernameSuggestion && !usernameAvailable ? (
                    <button
                      type="button"
                      className="text-[12px] text-zinc-300 underline hover:text-white"
                      onClick={() => {
                        setUsernameChecking(true);
                        setVibelyId(usernameSuggestion);
                      }}
                    >
                      {t('auth.useSuggestion', { suggestion: usernameSuggestion })}
                    </button>
                  ) : null}
                  <button
                    className={`h-10 w-full rounded px-3 text-xl font-medium leading-none transition ${
                      canSubmitUsername
                        ? "bg-red-600 text-white hover:bg-red-500"
                        : "cursor-not-allowed bg-zinc-800 text-zinc-400"
                    }`}
                    type="submit"
                    disabled={!canSubmitUsername}
                  >
                    {t('auth.signupShort')}
                  </button>
                </form>
                <button
                  type="button"
                  className="w-full text-[13px] text-zinc-300 hover:text-white"
                  onClick={() => {
                    setUsernameChecking(true);
                    setVibelyId(buildSuggestedUsername());
                  }}
                >
                  {t('auth.skip')}
                </button>
                {status ? (
                  <p className="text-center text-xs text-zinc-400">{status}</p>
                ) : null}
              </div>
            </>
          ) : null}
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
            {t('auth.hasAccount')}{" "}
            {asModal ? (
              <button
                type="button"
                className="font-semibold text-red-500"
                onClick={() => guestAuthUi?.openLogin()}
              >
                {t('auth.loginLink')}
              </button>
            ) : (
              <Link className="font-semibold text-red-500" to="/login">
                {t('auth.loginLink')}
              </Link>
            )}
          </p>
        </div>
      </div>

    </section>
  );
}
