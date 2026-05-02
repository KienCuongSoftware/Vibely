import React from "react";
import { useEffect, useRef, useState } from "react";
import { useAuth } from "../state/useAuth";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { apiClient } from "../api/client";
import { FaFacebook, FaUser } from "react-icons/fa";
import { FcGoogle } from "react-icons/fc";
import {
  IoArrowBack,
  IoClose,
  IoEyeOffOutline,
  IoEyeOutline,
} from "react-icons/io5";

import { resolveBackendOrigin } from "../config/apiBase.js";

const OAUTH_BACKEND_ORIGIN = resolveBackendOrigin();

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

    const oneTimeCode = searchParams.get("code");
    if (!oneTimeCode) {
      navigate(
        "/login?oauth=error&message=Thi%E1%BA%BFu%20m%C3%A3%20x%C3%A1c%20th%E1%BB%B1c%20Google%2C%20vui%20l%C3%B2ng%20th%E1%BB%AD%20l%E1%BA%A1i",
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
      .then((oauthData) => {
        // Bảo đảm có đủ `username/avatarUrl` bằng cách re-fetch `/api/auth/me`
        // (trường hợp backend trả thiếu field ở bước oauth exchange).
        apiClient
          .me(oauthData.accessToken)
          .then((me) => {
            completeOAuthLogin({
              accessToken: oauthData.accessToken,
              refreshToken: oauthData.refreshToken,
              userId: Number(me?.id ?? oauthData.userId),
              username: me?.username ?? oauthData.username,
              displayName: me?.displayName ?? oauthData.displayName,
              email: me?.email ?? oauthData.email,
              avatarUrl: me?.avatarUrl ?? oauthData.avatarUrl,
            });
            navigate("/foryou", { replace: true });
          })
          .catch(() => {
            // Fallback: vẫn login theo payload exchange nếu `/me` không thành công.
            completeOAuthLogin({
              accessToken: oauthData.accessToken,
              refreshToken: oauthData.refreshToken,
              userId: Number(oauthData.userId),
              username: oauthData.username,
              displayName: oauthData.displayName,
              email: oauthData.email,
              avatarUrl: oauthData.avatarUrl,
            });
            navigate("/foryou", { replace: true });
          });
      })
      .catch((error) => {
        oauthInFlightRef.current = false;
        navigate(
          `/login?oauth=error&message=${encodeURIComponent(error.message || "Đăng nhập bằng tài khoản liên kết thất bại, vui lòng thử lại")}`,
          { replace: true },
        );
      });
  }, [completeOAuthLogin, navigate, searchParams, token]);

  const handleGoogleAuth = () => {
    window.location.href = `${OAUTH_BACKEND_ORIGIN}/oauth2/authorization/google`;
  };

  const handleFacebookAuth = () => {
    window.location.href = `${OAUTH_BACKEND_ORIGIN}/oauth2/authorization/facebook`;
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
      setStatus("Đăng nhập thành công");
    } catch (error) {
      setStatus(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="relative flex min-h-screen items-center justify-center bg-black/70 px-4 py-8 text-zinc-100">
      <div className="w-full max-w-2xl rounded-2xl border border-zinc-800 bg-zinc-950 shadow-2xl">
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
            <div className="mx-auto max-w-lg space-y-4 px-6 pb-8 text-sm">
              <h2 className="text-center text-3xl font-bold">
                Đăng nhập vào Vibely
              </h2>
              <div className="mx-auto h-1 w-11/12 rounded-full bg-zinc-800" />

              <div className="space-y-3">
                <button
                  type="button"
                  className="flex h-[60px] w-full min-h-[60px] items-center gap-4 rounded-xl bg-zinc-800 px-4 text-left text-base hover:bg-zinc-700"
                  onClick={() => {
                    setView("credentials");
                    setStatus("");
                  }}
                >
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center">
                    <FaUser className="text-xl text-zinc-100" aria-hidden />
                  </span>
                  <span>Dùng email / username</span>
                </button>
                <button
                  type="button"
                  className="flex h-[60px] w-full min-h-[60px] items-center gap-4 rounded-xl bg-zinc-800 px-4 text-left text-base hover:bg-zinc-700"
                  onClick={handleGoogleAuth}
                >
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center">
                    <FcGoogle className="text-[28px]" aria-hidden />
                  </span>
                  <span>Tiếp tục với Google</span>
                </button>
                <button
                  type="button"
                  className="flex h-[60px] w-full min-h-[60px] items-center gap-4 rounded-xl bg-zinc-800 px-4 text-left text-base hover:bg-zinc-700"
                  onClick={handleFacebookAuth}
                >
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#1877F2]">
                    <FaFacebook className="text-[22px] text-white" aria-hidden />
                  </span>
                  <span>Tiếp tục với Facebook</span>
                </button>
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
            <div className="mx-auto max-w-lg space-y-4 px-6 pb-8 text-sm">
              <h2 className="text-center text-3xl font-bold">Đăng nhập</h2>
              <div className="text-base font-medium text-zinc-100">
                Email hoặc tên người dùng
              </div>
              <form className="space-y-3" onSubmit={submitWithCredentials}>
                <input
                  className="w-full rounded bg-zinc-800 px-4 py-3 text-base"
                  placeholder="Email hoặc tên người dùng"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                />
                <div className="relative">
                  <input
                    className="w-full runded bg-zinc-800 px-4 py-3 text-base"
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
                  className="text-sm text-zinc-200 hover:text-white"
                  onClick={() =>
                    setStatus(
                      "Luồng quên mật khẩu sẽ được bổ sung ở bước tiếp theo",
                    )
                  }
                >
                  Quên mật khẩu?
                </button>
                <button
                  className={`w-full rounded px-3 py-3 text-base font-semibold transition ${
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
        <div className="rounded-b-2xl border-t border-zinc-800 bg-zinc-900/70 px-6 py-5 text-center">
          <p className="mx-auto max-w-xl text-xs leading-relaxed text-zinc-400">
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
          <p className="mt-5 text-sm text-zinc-300">
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
