import React, { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
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
import { apiClient } from "../api/client";
import { useAuth } from "../state/useAuth";

import { resolveBackendOrigin } from "../config/apiBase.js";
import {
  persistLastLoginMethod,
  useLastLoginMethod,
} from "../auth/useLastLoginMethod.js";
import {
  AUTH_FIELD_AT,
  AUTH_FIELD_ERROR,
  AUTH_FIELD_OTP,
  AUTH_FIELD_WITH_ICON,
} from "../components/auth/authFieldClasses.js";
import { BirthDateFields } from "../components/auth/BirthDateSelect.jsx";
import { LoginMethodButton } from "../components/auth/LoginMethodButton.jsx";
import { ChallengeModal } from "../security/captcha/ChallengeModal.jsx";
import {
  buildAntiBotHeaders,
  CAPTCHA_VERIFICATION_HEADER,
} from "../security/headers/buildAntiBotHeaders.js";
import { useAntiBot } from "../security/hooks/useAntiBot.js";
import { clearVerificationToken } from "../security/sdk/antiBotClient.js";

const OAUTH_BACKEND_ORIGIN = resolveBackendOrigin();
const OAUTH_ONBOARDING_KEY = "vibely_oauth_pending";

function normalizeVibelyId(value) {
  return value.trim().toLowerCase().replace(/^@+/, "");
}

export function SignupPage() {
  const { register, completeOAuthLogin } = useAuth();
  const navigate = useNavigate();
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
    document.title = "Đăng ký | Vibely";
  }, []);

  useEffect(() => {
    if (searchParams.get("onboarding") !== "oauth") return;
    const raw = sessionStorage.getItem(OAUTH_ONBOARDING_KEY);
    if (!raw) {
      navigate("/login", { replace: true });
      return;
    }
    try {
      const parsed = JSON.parse(raw);
      if (!parsed?.userId && !parsed?.email) {
        navigate("/login", { replace: true });
        return;
      }
      setOauthPending(parsed);
      setView("oauth-birth");
    } catch {
      navigate("/login", { replace: true });
    }
  }, [navigate, searchParams]);

  const canContinueToUsername =
    birthMonth &&
    birthDay &&
    birthYear &&
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
    birthMonth && birthDay && birthYear && !loading,
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
    normalizedEmail.length > 0 &&
    isEmailValid &&
    isPasswordValid &&
    !sendingCode &&
    !loading &&
    resendSeconds === 0;
  const monthOptions = [
    "Tháng Một",
    "Tháng Hai",
    "Tháng Ba",
    "Tháng Tư",
    "Tháng Năm",
    "Tháng Sáu",
    "Tháng Bảy",
    "Tháng Tám",
    "Tháng Chín",
    "Tháng Mười",
    "Tháng Mười Một",
    "Tháng Mười Hai",
  ];
  const yearOptions = Array.from({ length: 2026 - 1900 + 1 }, (_, index) =>
    String(2026 - index),
  );
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
        })
        .catch((error) => {
          setUsernameAvailable(false);
          setUsernameSuggestion("");
          setUsernameMessage(error.message);
        })
        .finally(() => setUsernameChecking(false));
    }, 350);

    return () => clearTimeout(timeoutId);
  }, [normalizedVibelyId, view]);

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
    if (!birthMonth || !birthDay || !birthYear) {
      setStatus("Vui lòng chọn ngày sinh");
      return;
    }
    const suggestion = buildSuggestedUsername(oauthPending?.email ?? "");
    setUsernameChecking(true);
    setVibelyId(suggestion);
    setView("oauth-username");
    setStatus("Chọn Vibely ID để hoàn tất đăng ký.");
  };

  const submitOAuthOnboarding = async (event) => {
    event.preventDefault();
    if (!oauthPending?.userId && !oauthPending?.email) {
      setStatus("Phiên đăng ký đã hết hạn, vui lòng đăng nhập lại");
      navigate("/login", { replace: true });
      return;
    }
    if (!normalizedVibelyId) {
      setStatus("Vui lòng nhập Vibely ID");
      return;
    }
    if (!usernameAvailable) {
      const suggestionText = usernameSuggestion
        ? ` Gợi ý: @${usernameSuggestion}`
        : "";
      setStatus(`Vibely ID chưa hợp lệ hoặc đã tồn tại.${suggestionText}`);
      return;
    }
    if (!birthMonth || !birthDay || !birthYear) {
      setStatus("Vui lòng chọn ngày sinh");
      setView("oauth-birth");
      return;
    }

    const birthDate = `${birthYear}-${String(birthMonth).padStart(2, "0")}-${String(birthDay).padStart(2, "0")}`;

    setLoading(true);
    setStatus("Đang hoàn tất đăng ký...");
    try {
      const result = await apiClient.completeOnboarding({
        username: normalizedVibelyId,
        birthDate,
      });
      sessionStorage.removeItem(OAUTH_ONBOARDING_KEY);
      const provider = oauthPending?.provider;
      if (provider) {
        persistLastLoginMethod(provider);
      }
      completeOAuthLogin({
        userId: Number(result.userId),
        username: result.username,
        displayName: result.displayName,
        email: result.email,
        avatarUrl: result.avatarUrl,
      });
      setStatus("Đăng ký thành công");
      navigate("/foryou", { replace: true });
    } catch (error) {
      setStatus(error.message);
    } finally {
      setLoading(false);
    }
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
          `Đã gửi mã 6 số tới ${normalizedEmail}. Kiểm tra hộp thư đến (và cả thư rác/quảng cáo).`,
        );
      } else if (result?.demoCode) {
        setStatus(
          `Chưa bật gửi email (dev). Mã xác minh: ${result.demoCode}`,
        );
      } else {
        setStatus(
          "Không gửi được email xác minh. Liên hệ quản trị hoặc thử lại sau.",
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
    window.location.href = `${OAUTH_BACKEND_ORIGIN}/oauth2/authorization/${provider}`;
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
      setStatus("Vui lòng nhập đầy đủ thông tin");
      return;
    }
    if (!isEmailValid) {
      setStatus("Vui lòng nhập email hợp lệ để đăng ký tài khoản.");
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
    setStatus("Mã OTP hợp lệ. Hãy chọn Vibely ID để hoàn tất đăng ký.");
  };

  const submitRegisterWithUsername = async (event) => {
    event.preventDefault();
    if (!otpVerified) {
      setStatus("Vui lòng hoàn tất bước xác minh OTP trước");
      return;
    }
    if (!normalizedVibelyId) {
      setStatus("Vui lòng nhập Vibely ID");
      return;
    }
    if (!usernameAvailable) {
      const suggestionText = usernameSuggestion
        ? ` Gợi ý: @${usernameSuggestion}`
        : "";
      setStatus(`Vibely ID chưa hợp lệ hoặc đã tồn tại.${suggestionText}`);
      return;
    }

    if (!birthMonth || !birthDay || !birthYear) {
      setStatus("Vui lòng chọn ngày sinh");
      setView("credentials");
      return;
    }

    const birthDate = `${birthYear}-${String(birthMonth).padStart(2, "0")}-${String(birthDay).padStart(2, "0")}`;

    setLoading(true);
    setStatus("Đang tạo tài khoản...");
    try {
      pendingCaptchaActionRef.current = "register";
      const human = await ensureHuman();
      if (!human.verified) {
        setStatus("Vui lòng hoàn thành xác minh bảo mật");
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
      setStatus("Đăng ký thành công");
    } catch (error) {
      if (error.status === 428 && error.captchaRequired) {
        handleCaptchaRequired(error.captchaRequired);
        setStatus("Vui lòng hoàn thành xác minh bảo mật");
        return;
      }
      if (
        typeof error.message === "string" &&
        error.message.includes("Captcha verification")
      ) {
        clearVerificationToken();
        handleCaptchaRequired({ challengeLevel: "ROTATE" });
        setStatus("Captcha đã hết hạn, vui lòng xác minh lại");
        return;
      }
      setStatus(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="relative flex min-h-screen items-center justify-center overflow-hidden bg-black/70 px-4 py-6 text-zinc-100">
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
      <div className="flex max-h-[94vh] w-full max-w-[520px] flex-col overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-950 shadow-2xl">
        <div className="min-h-0 flex-1 overflow-y-auto [scrollbar-gutter:stable] [scrollbar-width:thin] [scrollbar-color:#27272a_transparent] [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-zinc-800 [&::-webkit-scrollbar-track]:bg-zinc-950 [&::-webkit-scrollbar]:w-1.5">
          {view === "methods" ? (
            <>
              <div className="flex justify-end p-4">
                <Link
                  to="/foryou"
                  className="flex h-10 w-10 items-center justify-center rounded-full bg-zinc-800 text-zinc-200 hover:bg-zinc-700"
                  aria-label="Đóng"
                >
                  <IoClose className="text-2xl" />
                </Link>
              </div>
              <div className="mx-auto w-full max-w-[380px] space-y-4 px-5 pb-7 text-sm">
                <h2 className="text-center text-3xl font-bold leading-tight">
                  Đăng ký Vibely
                </h2>
                <div className="mx-auto h-1 w-11/12 rounded-full bg-zinc-800" />

                <div className="space-y-3">
                  <LoginMethodButton
                    label="Sử dụng email"
                    recentlyUsed={lastLoginMethod === "email"}
                    onClick={() => {
                      setView("credentials");
                      setStatus("");
                    }}
                    icon={<FaUser className="text-xl text-zinc-100" aria-hidden />}
                  />
                  <LoginMethodButton
                    label="Tiếp tục với Google"
                    recentlyUsed={lastLoginMethod === "google"}
                    onClick={() => startOAuth("google")}
                    icon={<FcGoogle className="text-[28px]" aria-hidden />}
                  />
                  <LoginMethodButton
                    label="Tiếp tục với Facebook"
                    recentlyUsed={lastLoginMethod === "facebook"}
                    onClick={() => startOAuth("facebook")}
                    icon={
                      <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#1877F2]">
                        <FaFacebook className="text-[22px] text-white" aria-hidden />
                      </span>
                    }
                  />
                  <LoginMethodButton
                    label="Tiếp tục với LINE"
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
                  className="flex h-10 w-10 items-center justify-center rounded-full bg-zinc-800 text-zinc-200 hover:bg-zinc-700"
                  aria-label="Quay lại"
                >
                  <IoArrowBack className="text-2xl" />
                </button>
                <Link
                  to="/foryou"
                  className="flex h-10 w-10 items-center justify-center rounded-full bg-zinc-800 text-zinc-200 hover:bg-zinc-700"
                  aria-label="Đóng"
                >
                  <IoClose className="text-2xl" />
                </Link>
              </div>
              <div className="mx-auto w-full max-w-[380px] space-y-3 px-5 pb-6 text-sm">
                <h2 className="text-center text-3xl font-bold leading-tight">
                  Đăng ký
                </h2>
                <p className="text-[13px] text-zinc-100">
                  Vui lòng cho biết ngày sinh của bạn.
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
                    yearOptions={yearOptions}
                  />

                  <p className="text-[12px] text-zinc-500">
                    Ngày sinh của bạn sẽ không được hiển thị công khai.
                  </p>
                  <div className="flex items-center justify-between">
                    <span className="text-[13px] font-semibold text-zinc-100">
                      Email
                    </span>
                    <button
                      type="button"
                      className="text-[12px] text-zinc-100 hover:text-zinc-300"
                    >
                      Đăng ký bằng số điện thoại
                    </button>
                  </div>
                  <div className="relative">
                    <input
                      className={
                        showEmailError ? AUTH_FIELD_ERROR : AUTH_FIELD_WITH_ICON
                      }
                      placeholder="Địa chỉ email"
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
                      Nhập địa chỉ email hợp lệ
                    </p>
                  ) : null}
                  <div className="relative">
                    <input
                      className={AUTH_FIELD_WITH_ICON}
                      placeholder="Mật khẩu"
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
                        showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"
                      }
                    >
                      {showPassword ? <IoEyeOutline /> : <IoEyeOffOutline />}
                    </button>
                  </div>
                  {isPasswordFocused ? (
                    <div className="space-y-0.5 text-[12px] text-zinc-300">
                      <p className="font-medium text-zinc-200">
                        Mật khẩu của bạn phải gồm:
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
                        {passwordHasValidLength ? "✓" : "·"} 8 đến 20 ký tự
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
                        {passwordHasRequiredCharacters ? "✓" : "·"} Các chữ cái,
                        số và ký tự đặc biệt
                      </p>
                    </div>
                  ) : null}
                  <div className="flex">
                    <input
                      className={AUTH_FIELD_OTP}
                      placeholder="Nhập mã gồm 6 chữ số"
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
                        ? "Đang gửi..."
                        : resendSeconds > 0
                          ? `Gửi lại mã: ${resendSeconds}s`
                          : "Gửi mã"}
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
                      Nhận nội dung thịnh hành, bản tin, khuyến mại, đề xuất và
                      thông tin cập nhật tài khoản được gửi đến email của bạn
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
                    {loading ? (
                      <span
                        className="inline-flex items-center justify-center"
                        aria-label="Đang xử lý"
                      >
                        <span className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                      </span>
                    ) : (
                      "Tiếp"
                    )}
                  </button>
                </form>
                {status ? (
                  <p className="text-center text-xs text-zinc-400">{status}</p>
                ) : null}
              </div>
            </>
          ) : view === "oauth-birth" ? (
            <>
              <div className="flex justify-end p-4">
                <Link
                  to="/foryou"
                  className="flex h-10 w-10 items-center justify-center rounded-full bg-zinc-800 text-zinc-200 hover:bg-zinc-700"
                  aria-label="Đóng"
                >
                  <IoClose className="text-2xl" />
                </Link>
              </div>
              <div className="mx-auto w-full max-w-[380px] space-y-3 px-5 pb-6 text-sm">
                <h2 className="text-center text-3xl font-bold leading-tight">
                  Đăng ký
                </h2>
                <p className="text-[13px] text-zinc-100">
                  Vui lòng cho biết ngày sinh của bạn.
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
                    yearOptions={yearOptions}
                  />
                  <p className="text-[12px] text-zinc-500">
                    Ngày sinh của bạn sẽ không được hiển thị công khai.
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
                    Tiếp
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
                  onClick={() => setView("oauth-birth")}
                  className="flex h-10 w-10 items-center justify-center rounded-full bg-zinc-800 text-zinc-200 hover:bg-zinc-700"
                  aria-label="Quay lại"
                >
                  <IoArrowBack className="text-2xl" />
                </button>
                <Link
                  to="/foryou"
                  className="flex h-10 w-10 items-center justify-center rounded-full bg-zinc-800 text-zinc-200 hover:bg-zinc-700"
                  aria-label="Đóng"
                >
                  <IoClose className="text-2xl" />
                </Link>
              </div>
              <div className="mx-auto w-full max-w-[380px] space-y-3 px-5 pb-6 text-sm">
                <h2 className="text-center text-3xl font-bold leading-tight">
                  Đăng ký
                </h2>
                <p className="text-[13px] text-zinc-100">Tạo Vibely ID</p>
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
                      placeholder="your.id"
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
                      ? "Đang kiểm tra Vibely ID..."
                      : normalizedVibelyId
                        ? usernameMessage || "Bạn luôn có thể thay đổi sau"
                        : "Nhập Vibely ID để kiểm tra"}
                  </p>
                  {usernameSuggestion && !usernameAvailable ? (
                    <button
                      type="button"
                      className="text-[12px] text-zinc-300 underline hover:text-white"
                      onClick={() => {
                        setUsernameChecking(true);
                        setVibelyId(usernameSuggestion);
                      }}
                    >
                      Dùng gợi ý: @{usernameSuggestion}
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
                    {loading ? (
                      <span
                        className="inline-flex items-center justify-center"
                        aria-label="Đang xử lý"
                      >
                        <span className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                      </span>
                    ) : (
                      "Hoàn tất"
                    )}
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
                  className="flex h-10 w-10 items-center justify-center rounded-full bg-zinc-800 text-zinc-200 hover:bg-zinc-700"
                  aria-label="Quay lại"
                >
                  <IoArrowBack className="text-2xl" />
                </button>
                <Link
                  to="/foryou"
                  className="flex h-10 w-10 items-center justify-center rounded-full bg-zinc-800 text-zinc-200 hover:bg-zinc-700"
                  aria-label="Đóng"
                >
                  <IoClose className="text-2xl" />
                </Link>
              </div>
              <div className="mx-auto w-full max-w-[380px] space-y-3 px-5 pb-6 text-sm">
                <h2 className="text-center text-3xl font-bold leading-tight">
                  Đăng ký
                </h2>
                <p className="text-[13px] text-zinc-100">Tạo Vibely ID</p>
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
                      placeholder="your.id"
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
                      ? "Đang kiểm tra Vibely ID..."
                      : normalizedVibelyId
                        ? usernameMessage || "Bạn luôn có thể thay đổi sau"
                        : "Nhập Vibely ID để kiểm tra"}
                  </p>
                  {usernameSuggestion && !usernameAvailable ? (
                    <button
                      type="button"
                      className="text-[12px] text-zinc-300 underline hover:text-white"
                      onClick={() => {
                        setUsernameChecking(true);
                        setVibelyId(usernameSuggestion);
                      }}
                    >
                      Dùng gợi ý: @{usernameSuggestion}
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
                    {loading ? (
                      <span
                        className="inline-flex items-center justify-center"
                        aria-label="Đang xử lý"
                      >
                        <span className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                      </span>
                    ) : (
                      "Đăng ký"
                    )}
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
                  Bỏ qua
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
            Bằng việc tiếp tục với một tài khoản tại Việt Nam, bạn đồng ý với{" "}
            <a
              className="text-zinc-200 underline hover:text-white"
              href="/legal/page/row/terms-of-service"
              target="_blank"
              rel="noreferrer"
            >
              Điều Khoản Dịch Vụ
            </a>{" "}
            và xác nhận rằng bạn đã đọc{" "}
            <a
              className="text-zinc-200 underline hover:text-white"
              href="/legal/page/row/privacy-policy"
              target="_blank"
              rel="noreferrer"
            >
              Chính Sách Quyền Riêng Tư
            </a>
            .
          </p>
          <p className="mt-3 text-[13px] text-zinc-300">
            Bạn đã có tài khoản?{" "}
            <Link className="font-semibold text-red-500" to="/login">
              Đăng nhập
            </Link>
          </p>
        </div>
      </div>

    </section>
  );
}
