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
import { LoginMethodButton } from "../components/auth/LoginMethodButton.jsx";

const OAUTH_BACKEND_ORIGIN = resolveBackendOrigin();
const OAUTH_ONBOARDING_KEY = "vibely_oauth_pending";

export function LoginPage() {
  const { token, login, completeOAuthLogin } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const oauthInFlightRef = useRef(false);
  const processedOAuthCodeRef = useRef("");
  const [view, setView] = useState("methods");
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(false);
  const lastLoginMethod = useLastLoginMethod();
  const canSubmit =
    identifier.trim().length > 0 && password.trim().length > 0 && !loading;
  const oauthErrorMessage =
    searchParams.get("oauth") === "error"
      ? (searchParams.get("message") ??
        "Đăng nhập bằng tài khoản liên kết thất bại, vui lòng thử lại")
      : "";

  useEffect(() => {
    document.title = "Đăng nhập | Vibely";
  }, []);

  useEffect(() => {
    if (token) {
      navigate("/foryou", { replace: true });
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
          me = await apiClient.me(oauthData.accessToken);
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
              accessToken: oauthData.accessToken,
              refreshToken: oauthData.refreshToken,
              userId: Number(profile.userId ?? profile.id),
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
          accessToken: oauthData.accessToken,
          refreshToken: oauthData.refreshToken,
          userId: Number(profile.userId ?? profile.id ?? oauthData.userId),
          username: profile.username ?? oauthData.username,
          displayName: profile.displayName ?? oauthData.displayName,
          email: profile.email ?? oauthData.email,
          avatarUrl: profile.avatarUrl ?? oauthData.avatarUrl,
        });
        navigate("/foryou", { replace: true });
      })
      .catch((error) => {
        oauthInFlightRef.current = false;
        navigate(
          `/login?oauth=error&message=${encodeURIComponent(error.message || "Đăng nhập bằng tài khoản liên kết thất bại, vui lòng thử lại")}`,
          { replace: true },
        );
      });
  }, [completeOAuthLogin, navigate, searchParams, token]);

  const startOAuth = (provider) => {
    window.location.href = `${OAUTH_BACKEND_ORIGIN}/oauth2/authorization/${provider}`;
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
    setLoading(true);
    setStatus("Đang đăng nhập...");
    try {
      await login(identifier, password);
      persistLastLoginMethod("email");
      setStatus("Đăng nhập thành công");
    } catch (error) {
      setStatus(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="relative flex min-h-screen items-center justify-center overflow-hidden bg-black/70 px-4 py-6 text-zinc-100">
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
        ) : (
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
                Đăng nhập
              </h2>
              <div className="text-[13px] font-medium text-zinc-100">
                Email hoặc tên người dùng
              </div>
              <form className="space-y-2.5" onSubmit={submitWithCredentials}>
                <input
                  className="h-10 w-full rounded bg-zinc-800 px-4 text-[13px]"
                  placeholder="Email hoặc tên người dùng"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                />
                <div className="relative">
                  <input
                    className="h-10 w-full rounded bg-zinc-800 px-4 text-[13px]"
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
                  onClick={() =>
                    setStatus(
                      "Luồng quên mật khẩu sẽ được bổ sung ở bước tiếp theo",
                    )
                  }
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
