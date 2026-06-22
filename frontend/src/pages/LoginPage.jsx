import React from "react";
import { useEffect, useRef, useState } from "react";
import { useAuth } from "../state/useAuth";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { apiClient } from "../api/client";
import { FaFacebook, FaUser } from "react-icons/fa";
import { FcGoogle } from "react-icons/fc";
import { SiLine } from "react-icons/si";
import {
  IoArrowBack,
  IoClose,
  IoEyeOffOutline,
  IoEyeOutline,
} from "react-icons/io5";

import { resolveBackendOrigin } from "../config/apiBase.js";
import { normalizeLastLoginMethod } from "../auth/lastLoginMethod.js";
import {
  persistLastLoginMethod,
  useLastLoginMethod,
} from "../auth/useLastLoginMethod.js";
import {
  AUTH_FIELD,
  AUTH_FIELD_OTP,
  AUTH_FIELD_WITH_ICON,
} from "../components/auth/authFieldClasses.js";
import { LoginMethodButton } from "../components/auth/LoginMethodButton.jsx";
import { ChallengeModal } from "../security/captcha/ChallengeModal.jsx";
import {
  buildAntiBotHeaders,
  CAPTCHA_VERIFICATION_HEADER,
} from "../security/headers/buildAntiBotHeaders.js";
import { useAntiBot } from "../security/hooks/useAntiBot.js";
import { clearVerificationToken } from "../security/sdk/antiBotClient.js";
import { collectLoginContext } from "../security/loginContext.js";

const OAUTH_ONBOARDING_KEY = "vibely_oauth_pending";

export function LoginPage() {
  const { token, user, login, reactivateAccount, completeOAuthLogin } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const oauthInFlightRef = useRef(false);
  const processedOAuthCodeRef = useRef("");
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
  const challengePurpose =
    pendingCaptchaActionRef.current === "sendResetCode"
      ? "PASSWORD_RESET"
      : "LOGIN";
  const oauthErrorMessage = (() => {
    if (searchParams.get("oauth") !== "error") return "";
    const reason = searchParams.get("reason");
    if (reason === "clock_skew") {
      return "Đồng hồ máy tính lệch so với Google. Vào Cài đặt → Thời gian và ngôn ngữ → bật Đặt giờ tự động, rồi thử đăng nhập lại.";
    }
    if (reason === "redirect_mismatch") {
      return "Redirect URI OAuth không khớp. Kiểm tra Callback URL trên LINE/Google console và restart backend.";
    }
    if (reason === "session_lost") {
      return "Phiên OAuth bị mất (thường do cookie). Thử lại trên cùng trình duyệt, không mở tab ẩn danh.";
    }
    if (reason === "invalid_grant") {
      return "Mã xác thực OAuth hết hạn hoặc đã dùng. Vui lòng thử đăng nhập lại.";
    }
    return (
      searchParams.get("message") ??
      "Đăng nhập bằng tài khoản liên kết thất bại, vui lòng thử lại"
    );
  })();

  useEffect(() => {
    document.title =
      view === "forgot" ? "Đặt lại mật khẩu | Vibely" : "Đăng nhập | Vibely";
  }, [view]);

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
    if (token && user) {
      const destination = String(user.role ?? "").toUpperCase() === "ADMIN" ? "/admin" : "/foryou";
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
        let profile = oauthData;
        let me = null;
        try {
          me = await apiClient.me();
          profile = { ...oauthData, ...me };
        } catch {
          // Giữ payload exchange nếu `/me` không thành công.
        }

        const needsOnboarding =
          Boolean(oauthData?.needsOnboarding) || Boolean(me?.needsOnboarding);
        if (needsOnboarding) {
          sessionStorage.setItem(
            OAUTH_ONBOARDING_KEY,
            JSON.stringify({
              userId: Number(profile.userId ?? profile.id ?? oauthData.userId),
              email: profile.email ?? oauthData.email,
              displayName: profile.displayName ?? oauthData.displayName,
              avatarUrl: profile.avatarUrl ?? oauthData.avatarUrl,
              provider: oauthProvider ?? undefined,
            }),
          );
          navigate("/signup?onboarding=oauth", { replace: true });
          return;
        }

        if (oauthProvider) {
          persistLastLoginMethod(oauthProvider);
        }
        completeOAuthLogin({
          userId: Number(profile.userId ?? profile.id ?? oauthData.userId),
          username: profile.username ?? oauthData.username,
          displayName: profile.displayName ?? oauthData.displayName,
          email: profile.email ?? oauthData.email,
          role: profile.role ?? oauthData.role,
          avatarUrl: profile.avatarUrl ?? oauthData.avatarUrl,
        });
        navigate(
          String((profile.role ?? oauthData.role) ?? "").toUpperCase() === "ADMIN"
            ? "/admin"
            : "/foryou",
          { replace: true },
        );
      })
      .catch((error) => {
        oauthInFlightRef.current = false;
        navigate(
          `/login?oauth=error&message=${encodeURIComponent(error.message || "Đăng nhập bằng tài khoản liên kết thất bại, vui lòng thử lại")}`,
          { replace: true },
        );
      });
  }, [completeOAuthLogin, navigate, searchParams, token, user]);

  const startOAuth = (provider) => {
    window.location.href = `${resolveBackendOrigin()}/oauth2/authorization/${provider}`;
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
      setReactivationError("Phiên kích hoạt lại tài khoản không hợp lệ, vui lòng đăng nhập lại");
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
        setReactivationError(`Chưa bật gửi email (dev). Mã kích hoạt lại: ${result.demoCode}`);
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
      setStatus("Tài khoản đã được kích hoạt lại");
      navigate(String(result?.role ?? "").toUpperCase() === "ADMIN" ? "/admin" : "/foryou", {
        replace: true,
      });
    } catch (error) {
      setReactivationError(error.message);
    } finally {
      setReactivationLoading(false);
    }
  };

  const performLogin = async () => {
    setLoading(true);
    setStatus("Đang đăng nhập...");
    try {
      const result = await login(identifier, password, buildAntiBotHeaders());
      clearVerificationToken();
      persistLastLoginMethod("email");
      setStatus("Đăng nhập thành công");
      navigate(String(result?.role ?? "").toUpperCase() === "ADMIN" ? "/admin" : "/foryou", {
        replace: true,
      });
    } catch (error) {
      if (error.code === "ACCOUNT_DEACTIVATED") {
        openReactivationModal(error.data, "email");
        setStatus("");
        return;
      }
      if (error.captchaRequired || error.code === "CAPTCHA_REQUIRED") {
        handleCaptchaRequired(error.captchaRequired ?? { challengeLevel: "ROTATE" });
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
          `Nếu tài khoản tồn tại, mã 6 số đã được gửi tới ${normalizedResetEmail}. Kiểm tra hộp thư đến và thư rác.`,
        );
      } else if (result?.demoCode) {
        setStatus(`Chưa bật gửi email (dev). Mã đặt lại mật khẩu: ${result.demoCode}`);
      } else {
        setStatus(
          "Nếu email đã đăng ký, mã sẽ được gửi. Kiểm tra hộp thư hoặc thử lại sau.",
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
        setSendResetError("Captcha đã hết hạn, vui lòng xác minh lại");
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
      setStatus("Vui lòng nhập đầy đủ email, mã 6 số và mật khẩu hợp lệ");
      return;
    }
    setResetLoading(true);
    setStatus("Đang đặt lại mật khẩu...");
    try {
      await apiClient.resetPassword({
        email: normalizedResetEmail,
        code: resetCode.trim(),
        newPassword: resetPassword,
      });
      setStatus("Đặt lại mật khẩu thành công. Bạn có thể đăng nhập.");
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
      setStatus("Vui lòng nhập email/tên người dùng và mật khẩu");
      return;
    }
    if (!identifier.includes("@")) {
      setStatus(
        "Hiện tại backend chỉ hỗ trợ đăng nhập bằng email. Vui lòng nhập email đã đăng ký.",
      );
      return;
    }
    try {
      const human = await ensureHuman();
      if (!human.verified) {
        setStatus("Vui lòng hoàn thành xác minh bảo mật");
        return;
      }
      await performLogin();
    } catch (error) {
      setStatus(error.message);
    }
  };

  return (
    <section className="relative flex min-h-screen items-center justify-center overflow-hidden bg-black/70 px-4 py-6 text-zinc-100">
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
      {reactivationOpen ? (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/70 px-4">
          <div className="w-full max-w-[340px] overflow-hidden rounded-sm border border-zinc-800 bg-[#121212] text-center shadow-2xl">
            <div className="px-6 py-6">
              <h2 className="text-xl font-bold text-zinc-100">
                Kích hoạt lại tài khoản Vibely
              </h2>
              <p className="mt-4 text-[13px] leading-relaxed text-zinc-300">
                Bạn đang đăng nhập vào tài khoản đã bị hủy kích hoạt. Kích hoạt lại
                tài khoản để tiếp tục sử dụng Vibely và khôi phục nội dung của bạn.
              </p>
              {reactivationMaskedEmail ? (
                <p className="mt-3 break-all text-[12px] text-zinc-500">
                  {reactivationMaskedEmail}
                </p>
              ) : null}
              {reactivationCodeSent ? (
                <div className="mt-4 text-left">
                  <label className="mb-1 block text-[12px] font-medium text-zinc-300">
                    Nhập mã xác minh 6 chữ số
                  </label>
                  <input
                    className={AUTH_FIELD}
                    inputMode="numeric"
                    maxLength={6}
                    placeholder="Mã xác minh"
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
                    Gửi lại mã
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
                  ? "Đang xử lý..."
                  : reactivationCodeSent
                    ? "Kích hoạt lại"
                    : "Gửi mã xác minh"}
              </button>
              <button
                type="button"
                className="h-12 w-full border-t border-zinc-800 text-[15px] font-medium text-zinc-200 hover:bg-zinc-900"
                onClick={closeReactivationModal}
              >
                Hủy
              </button>
            </div>
          </div>
        </div>
      ) : null}
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
                Đăng nhập vào Vibely
              </h2>
              <div className="mx-auto h-1 w-11/12 rounded-full bg-zinc-800" />

              <div className="space-y-3">
                <LoginMethodButton
                  label="Dùng email / username"
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
                Đăng nhập
              </h2>
              <div className="text-[13px] font-medium text-zinc-100">
                Email hoặc tên người dùng
              </div>
              <form className="space-y-2.5" onSubmit={submitWithCredentials}>
                <input
                  className={AUTH_FIELD}
                  placeholder="Email hoặc tên người dùng"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                />
                <div className="relative">
                  <input
                    className={AUTH_FIELD_WITH_ICON}
                    placeholder="Mật khẩu"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                  <button
                    type="button"
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-2xl text-zinc-400 hover:text-zinc-200"
                    onClick={() => setShowPassword((prev) => !prev)}
                    aria-label={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
                  >
                    {showPassword ? <IoEyeOutline /> : <IoEyeOffOutline />}
                  </button>
                </div>
                <button
                  type="button"
                  className="text-[12px] text-zinc-200 hover:text-white"
                  onClick={openForgotPassword}
                >
                  Quên mật khẩu?
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
                  {loading ? "Đang đăng nhập..." : "Đăng nhập"}
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
                Đặt lại mật khẩu
              </h2>
              <div className="flex items-center justify-between gap-2">
                <span className="text-[13px] font-semibold text-zinc-100">
                  Nhập địa chỉ email
                </span>
                <button
                  type="button"
                  className="shrink-0 text-[12px] text-zinc-400 hover:text-zinc-200"
                  onClick={() =>
                    setStatus("Đặt lại bằng số điện thoại sẽ được bổ sung sau")
                  }
                >
                  Đặt lại bằng số điện thoại
                </button>
              </div>
              <form className="space-y-2.5" onSubmit={submitResetPassword}>
                <input
                  className={AUTH_FIELD}
                  placeholder="Địa chỉ email"
                  type="email"
                  autoComplete="email"
                  value={resetEmail}
                  onChange={(e) => setResetEmail(e.target.value)}
                />
                <div className="flex">
                  <input
                    className={AUTH_FIELD_OTP}
                    placeholder="Nhập mã gồm 6 chữ số"
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
                      ? "Đang gửi..."
                      : resendSeconds > 0
                        ? `Gửi lại mã: ${resendSeconds}s`
                        : "Gửi mã"}
                  </button>
                </div>
                {sendResetError ? (
                  <p className="text-[12px] text-red-400">{sendResetError}</p>
                ) : null}
                <div className="relative">
                  <input
                    className={AUTH_FIELD_WITH_ICON}
                    placeholder="Mật khẩu"
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
                      showResetPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"
                    }
                  >
                    {showResetPassword ? <IoEyeOutline /> : <IoEyeOffOutline />}
                  </button>
                </div>
                {isResetPasswordFocused ? (
                  <div className="space-y-0.5 text-[12px] text-zinc-300">
                    <p className="font-medium text-zinc-200">
                      Mật khẩu của bạn phải gồm:
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
                      {resetPasswordHasValidLength ? "✓" : "·"} 8 đến 20 ký tự
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
                      {resetPasswordHasRequiredCharacters ? "✓" : "·"} Các chữ
                      cái, số và ký tự đặc biệt
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
                  {resetLoading ? "Đang xử lý..." : "Đặt lại mật khẩu"}
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
            Chưa có tài khoản?{" "}
            <Link className="font-semibold text-red-500" to="/signup">
              Đăng ký
            </Link>
          </p>
        </div>
      </div>
    </section>
  );
}
