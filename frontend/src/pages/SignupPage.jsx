import React from "react";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { FaFacebook, FaUser } from "react-icons/fa";
import { FcGoogle } from "react-icons/fc";
import {
  IoAlertCircleOutline,
  IoArrowBack,
  IoChevronDown,
  IoClose,
  IoEyeOffOutline,
  IoEyeOutline,
} from "react-icons/io5";
import { apiClient } from "../api/client";
import { useAuth } from "../state/useAuth";

import { resolveBackendOrigin } from "../config/apiBase.js";

const OAUTH_BACKEND_ORIGIN = resolveBackendOrigin();

function normalizeVibelyId(value) {
  return value.trim().toLowerCase().replace(/^@+/, "");
}

export function SignupPage() {
  const { register } = useAuth();
  const [view, setView] = useState("methods");
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
  const [showChallengeModal, setShowChallengeModal] = useState(false);
  const [challengeSelection, setChallengeSelection] = useState([]);
  const [challengeError, setChallengeError] = useState("");
  const [sendingCode, setSendingCode] = useState(false);
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
  const challengeShapes = [
    {
      id: 1,
      type: "circle",
      label: "Hình tròn A",
      className: "left-8 top-10 h-12 w-12 bg-yellow-300",
    },
    {
      id: 2,
      type: "triangle",
      label: "Hình tam giác",
      className:
        "left-28 top-8 h-14 w-14 bg-red-300 [clip-path:polygon(50%_0%,0%_100%,100%_100%)]",
    },
    {
      id: 3,
      type: "hexagon",
      label: "Lục giác",
      className:
        "left-52 top-6 h-12 w-12 bg-sky-300 [clip-path:polygon(25%_0%,75%_0%,100%_50%,75%_100%,25%_100%,0%_50%)]",
    },
    {
      id: 4,
      type: "circle",
      label: "Hình tròn B",
      className: "right-10 top-16 h-12 w-12 bg-yellow-300",
    },
    {
      id: 5,
      type: "square",
      label: "Hình vuông",
      className: "left-40 bottom-10 h-12 w-12 bg-zinc-300",
    },
  ];
  const hasTwoSelections = challengeSelection.length === 2;

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
    if (view !== "username") return undefined;
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

  const buildSuggestedUsername = () => {
    const fromEmail = normalizeVibelyId(normalizedEmail.split("@")[0] ?? "")
      .replace(/[^a-z0-9._]/g, ".")
      .replace(/\.+/g, ".")
      .replace(/^\.+|\.+$/g, "")
      .slice(0, 24);
    if (fromEmail.length >= 4) return fromEmail;
    return "vibely.user";
  };

  const handleOpenChallengeModal = () => {
    setChallengeSelection([]);
    setChallengeError("");
    setShowChallengeModal(true);
  };

  const handleGoogleAuth = () => {
    window.location.href = `${OAUTH_BACKEND_ORIGIN}/oauth2/authorization/google`;
  };

  const handleFacebookAuth = () => {
    window.location.href = `${OAUTH_BACKEND_ORIGIN}/oauth2/authorization/facebook`;
  };

  const toggleChallengeSelection = (shapeId) => {
    setChallengeError("");
    setChallengeSelection((previous) => {
      if (previous.includes(shapeId)) {
        return previous.filter((id) => id !== shapeId);
      }
      if (previous.length >= 2) {
        return [previous[1], shapeId];
      }
      return [...previous, shapeId];
    });
  };

  const handleChallengeConfirm = async () => {
    if (!hasTwoSelections) {
      setChallengeError("Vui lòng chọn đủ 2 hình để tiếp tục");
      return;
    }

    const selectedShapes = challengeShapes.filter((shape) =>
      challengeSelection.includes(shape.id),
    );
    if (selectedShapes[0]?.type !== selectedShapes[1]?.type) {
      setChallengeError("Hai hình chưa cùng dạng, vui lòng thử lại");
      return;
    }

    setSendingCode(true);
    setChallengeError("");
    try {
      const result = await apiClient.sendCode({
        email: normalizedEmail,
        challengePassed: true,
      });
      const cooldown = Number(result?.resendAfterSeconds) || 60;
      setResendSeconds(cooldown);
      setShowChallengeModal(false);
      setChallengeSelection([]);
      setVerifiedCodeSnapshot("");
      setVerifiedEmailSnapshot("");
      setStatus(
        result?.demoCode
          ? `Mã xác minh demo: ${result.demoCode}`
          : "Đã gửi mã xác minh, vui lòng kiểm tra email của bạn",
      );
    } catch (error) {
      setChallengeError(error.message);
    } finally {
      setSendingCode(false);
    }
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

    setLoading(true);
    setStatus("Đang tạo tài khoản...");
    try {
      await register({
        username: normalizedVibelyId,
        displayName: normalizedVibelyId,
        email: normalizedEmail,
        password,
        bio: "",
      });
      setStatus("Đăng ký thành công");
    } catch (error) {
      setStatus(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="relative flex h-screen overflow-hidden items-start justify-center bg-black/70 px-4 py-6 text-zinc-100">
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
                <h2 className="text-center text-[42px] font-bold leading-tight">
                  Đăng ký Vibely
                </h2>
                <div className="mx-auto h-1 w-11/12 rounded-full bg-zinc-800" />

                <div className="space-y-3">
                  <button
                    type="button"
                    className="flex h-[52px] w-full min-h-[52px] items-center gap-4 rounded-xl bg-zinc-800 px-4 text-left text-sm hover:bg-zinc-700"
                    onClick={() => {
                      setView("credentials");
                      setStatus("");
                    }}
                  >
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center">
                      <FaUser className="text-xl text-zinc-100" aria-hidden />
                    </span>
                    <span>Sử dụng email</span>
                  </button>
                  <button
                    type="button"
                    className="flex h-[52px] w-full min-h-[52px] items-center gap-4 rounded-xl bg-zinc-800 px-4 text-left text-sm hover:bg-zinc-700"
                    onClick={handleGoogleAuth}
                  >
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center">
                      <FcGoogle className="text-[28px]" aria-hidden />
                    </span>
                    <span>Tiếp tục với Google</span>
                  </button>
                  <button
                    type="button"
                    className="flex h-[52px] w-full min-h-[52px] items-center gap-4 rounded-xl bg-zinc-800 px-4 text-left text-sm hover:bg-zinc-700"
                    onClick={handleFacebookAuth}
                  >
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#1877F2]">
                      <FaFacebook className="text-[22px] text-white" aria-hidden />
                    </span>
                    <span>Tiếp tục với Facebook</span>
                  </button>
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
                <h2 className="text-center text-[42px] font-bold leading-tight">
                  Đăng ký
                </h2>
                <p className="text-[13px] text-zinc-100">
                  Vui lòng cho biết ngày sinh của bạn.
                </p>
                <form className="space-y-2.5" onSubmit={continueToUsernameStep}>
                  <div className="grid grid-cols-3 gap-2">
                    <div className="relative">
                      <select
                        className="h-10 w-full appearance-none rounded bg-zinc-800 px-3 pr-9 text-[13px] text-zinc-200 scheme-dark"
                        value={birthMonth}
                        onChange={(e) => setBirthMonth(e.target.value)}
                      >
                        <option value="">Tháng</option>
                        {monthOptions.map((label, index) => (
                          <option key={index + 1} value={String(index + 1)}>
                            {label}
                          </option>
                        ))}
                      </select>
                      <IoChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-zinc-300" />
                    </div>
                    <div className="relative">
                      <select
                        className="h-10 w-full appearance-none rounded bg-zinc-800 px-3 pr-9 text-[13px] text-zinc-200 scheme-dark"
                        value={birthDay}
                        onChange={(e) => setBirthDay(e.target.value)}
                      >
                        <option value="">Ngày</option>
                        {Array.from({ length: 31 }).map((_, index) => (
                          <option key={index + 1} value={String(index + 1)}>
                            {index + 1}
                          </option>
                        ))}
                      </select>
                      <IoChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-zinc-300" />
                    </div>
                    <div className="relative">
                      <select
                        className="h-10 w-full appearance-none rounded bg-zinc-800 px-3 pr-9 text-[13px] text-zinc-200 scheme-dark"
                        value={birthYear}
                        onChange={(e) => setBirthYear(e.target.value)}
                      >
                        <option value="">Năm</option>
                        {yearOptions.map((year) => (
                          <option key={year} value={year}>
                            {year}
                          </option>
                        ))}
                      </select>
                      <IoChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-zinc-300" />
                    </div>
                  </div>

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
                      className={`h-10 w-full rounded bg-zinc-800 px-4 pr-10 text-[13px] ${
                        showEmailError
                          ? "border border-red-500 text-red-400 focus:outline-none"
                          : ""
                      }`}
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
                      className="h-10 w-full rounded bg-zinc-800 px-4 text-[13px]"
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
                      className="h-10 flex-1 rounded-l bg-zinc-800 px-4 text-[13px]"
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
                      onClick={handleOpenChallengeModal}
                      disabled={!canSendVerificationCode}
                    >
                      {sendingCode
                        ? "Đang gửi..."
                        : resendSeconds > 0
                          ? `Gửi lại mã: ${resendSeconds}s`
                          : "Gửi mã"}
                    </button>
                  </div>
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
          ) : (
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
                <h2 className="text-center text-[42px] font-bold leading-tight">
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
                      className="h-10 w-full rounded bg-zinc-800 pl-7 pr-4 text-[13px] text-zinc-200"
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
            Bạn đã có tài khoản?{" "}
            <Link className="font-semibold text-red-500" to="/login">
              Đăng nhập
            </Link>
          </p>
        </div>
      </div>

      {showChallengeModal ? (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/70 px-4">
          <div className="w-full max-w-[520px] rounded-2xl border border-zinc-700 bg-zinc-900 p-5 shadow-2xl">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-xl font-semibold">
                Chọn 2 đối tượng có hình dạng giống nhau
              </h3>
              <button
                type="button"
                className="text-zinc-300 hover:text-white"
                onClick={() => setShowChallengeModal(false)}
                aria-label="Đóng xác minh"
              >
                <IoClose className="text-2xl" />
              </button>
            </div>

            <div className="relative mb-4 h-56 rounded-xl bg-zinc-100">
              {challengeShapes.map((shape) => {
                const selectedIndex = challengeSelection.indexOf(shape.id);
                return (
                  <button
                    key={shape.id}
                    type="button"
                    onClick={() => toggleChallengeSelection(shape.id)}
                    className={`absolute rounded-full transition ${shape.className} ${
                      selectedIndex >= 0
                        ? "ring-4 ring-red-500 ring-offset-2 ring-offset-zinc-100"
                        : ""
                    }`}
                    aria-label={shape.label}
                  >
                    {selectedIndex >= 0 ? (
                      <span className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full bg-red-500 text-xs font-semibold text-white">
                        {selectedIndex + 1}
                      </span>
                    ) : null}
                  </button>
                );
              })}
            </div>

            {challengeError ? (
              <p className="mb-3 text-sm text-red-400">{challengeError}</p>
            ) : null}
            <button
              type="button"
              className={`h-12 w-full rounded-lg text-xl font-semibold text-white ${
                sendingCode
                  ? "cursor-not-allowed bg-red-400/60"
                  : "bg-red-500 hover:bg-red-400"
              }`}
              onClick={handleChallengeConfirm}
              disabled={sendingCode}
            >
              {sendingCode ? "Đang xác nhận..." : "Xác nhận"}
            </button>
          </div>
        </div>
      ) : null}
    </section>
  );
}
