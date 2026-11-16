import React, { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { IoMenu } from "react-icons/io5";
import { AdminSidebar } from "@/features/admin/components/AdminSidebar.jsx";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { AccountAvatarMenu } from "@/shared/components/AccountAvatarMenu.jsx";
import { AvatarImage } from "@/shared/components/AvatarImage.jsx";
import {
  DEFAULT_AVATAR_URL,
  sanitizeAvatarUrl,
} from "@/features/profile/utils/avatarUrl.js";
import { useTheme } from "@/shared/theme/ThemeContext.jsx";

export function AdminLayout({ active = "dashboard", title, subtitle, children }) {
  const { t } = useTranslation();
  const { resolved } = useTheme();
  const isLight = resolved === "light";
  const { user, token, logout } = useAuth();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [showAccountMenu, setShowAccountMenu] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const accountMenuRef = useRef(null);
  const hoverCloseTimer = useRef(null);

  const avatarSrc = sanitizeAvatarUrl(
    user?.avatarUrl,
    DEFAULT_AVATAR_URL,
    user?.id,
  );

  const clearHoverClose = () => {
    if (hoverCloseTimer.current) {
      clearTimeout(hoverCloseTimer.current);
      hoverCloseTimer.current = null;
    }
  };

  const openMenu = () => {
    clearHoverClose();
    setShowAccountMenu(true);
  };

  const scheduleCloseMenu = () => {
    clearHoverClose();
    hoverCloseTimer.current = setTimeout(() => {
      setShowAccountMenu(false);
      hoverCloseTimer.current = null;
    }, 180);
  };

  useEffect(() => {
    return () => clearHoverClose();
  }, []);

  useEffect(() => {
    if (!showAccountMenu) return undefined;

    const handleOutsideClick = (event) => {
      if (!accountMenuRef.current?.contains(event.target)) {
        setShowAccountMenu(false);
      }
    };
    const handleEscape = (event) => {
      if (event.key === "Escape") {
        setShowAccountMenu(false);
        setShowLogoutConfirm(false);
      }
    };

    document.addEventListener("mousedown", handleOutsideClick);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [showAccountMenu]);

  useEffect(() => {
    if (!showLogoutConfirm) return undefined;
    const handleEscape = (event) => {
      if (event.key === "Escape") setShowLogoutConfirm(false);
    };
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [showLogoutConfirm]);

  const shell = isLight
    ? "bg-[#f1f1f2] text-[#161823]"
    : "bg-black text-zinc-100";
  const mainBg = isLight ? "bg-[#f1f1f2]" : "bg-black";
  const topBorder = isLight ? "border-zinc-200" : "border-zinc-800/80";
  const brandText = isLight ? "text-[#161823]" : "text-white";
  const iconBtn = isLight
    ? "text-zinc-700 hover:bg-zinc-200/80"
    : "text-zinc-200 hover:bg-zinc-900";
  const subtitleText = isLight ? "text-zinc-500" : "text-zinc-400";
  const avatarRing = isLight
    ? "ring-zinc-300 hover:ring-zinc-400"
    : "ring-zinc-600 hover:ring-zinc-400";
  const avatarBorder = isLight ? "border-zinc-200" : "border-zinc-800";

  return (
    <section className={`flex h-dvh overflow-hidden ${shell}`}>
      <AdminSidebar active={active} className="hidden lg:flex" />

      {mobileNavOpen ? (
        <>
          <button
            type="button"
            className={`fixed inset-0 z-200 lg:hidden ${
              isLight ? "bg-black/35" : "bg-black/50"
            }`}
            aria-label={t("admin.closeMenu")}
            onClick={() => setMobileNavOpen(false)}
          />
          <AdminSidebar
            active={active}
            className="fixed inset-y-0 left-0 z-210 flex w-[min(280px,85vw)] shadow-2xl lg:hidden"
            onNavigate={() => setMobileNavOpen(false)}
          />
        </>
      ) : null}

      <main
        className={`flex h-dvh min-w-0 flex-1 flex-col overflow-hidden p-3 sm:p-6 lg:p-8 ${mainBg}`}
      >
        <div
          className={`mb-4 flex shrink-0 items-center justify-between gap-3 border-b pb-3 sm:mb-5 sm:gap-4 sm:pb-4 ${topBorder}`}
        >
          <div className="flex min-w-0 flex-1 items-center gap-2">
            <button
              type="button"
              className={`flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-full text-xl lg:hidden ${iconBtn}`}
              aria-label={t("admin.menuAdmin")}
              onClick={() => setMobileNavOpen(true)}
            >
              <IoMenu aria-hidden />
            </button>
            <span
              className={`min-w-0 truncate text-base font-bold sm:text-lg lg:text-xl ${brandText}`}
            >
              {t("admin.brand")}
            </span>
          </div>

          <div
            className="relative shrink-0"
            ref={accountMenuRef}
            onMouseEnter={openMenu}
            onMouseLeave={scheduleCloseMenu}
          >
            <button
              type="button"
              className={`flex cursor-pointer rounded-full p-0.5 ring-1 transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#fe2c55] ${avatarRing}`}
              aria-label={t("common.accountMenu")}
              aria-expanded={showAccountMenu}
              aria-haspopup="menu"
              onClick={() => setShowAccountMenu((prev) => !prev)}
            >
              <AvatarImage
                src={avatarSrc}
                alt=""
                className={`h-9 w-9 rounded-full border object-cover ${avatarBorder}`}
              />
            </button>
            <AccountAvatarMenu
              open={showAccountMenu}
              onClose={() => setShowAccountMenu(false)}
              user={user}
              token={token}
              className="absolute right-0 top-full z-50 mt-2"
              onLogout={() => {
                setShowAccountMenu(false);
                setShowLogoutConfirm(true);
              }}
            />
          </div>
        </div>

        <header className="mb-4 shrink-0 sm:mb-5">
          <h1 className="text-[22px] font-bold tracking-tight sm:text-2xl">
            {title}
          </h1>
          {subtitle ? (
            <p className={`mt-1 max-w-2xl text-sm ${subtitleText}`}>{subtitle}</p>
          ) : null}
        </header>

        <div className="scrollbar-none min-h-0 flex-1 overflow-y-auto overflow-x-hidden overscroll-y-contain">
          {children}
        </div>
      </main>

      {showLogoutConfirm ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 px-4">
          <div
            className={`w-full max-w-sm rounded-xl p-6 text-center shadow-2xl ${
              isLight ? "bg-white text-zinc-900" : "bg-zinc-800 text-zinc-100"
            }`}
          >
            <p className="text-2xl font-bold leading-snug">
              {t("common.logoutConfirm")}
            </p>
            <div className="mt-5 grid grid-cols-2 gap-3 text-base">
              <button
                type="button"
                className={`rounded-md py-2 font-semibold ${
                  isLight
                    ? "bg-zinc-100 text-zinc-700 hover:bg-zinc-200"
                    : "bg-zinc-700 text-zinc-200 hover:bg-zinc-600"
                }`}
                onClick={() => setShowLogoutConfirm(false)}
              >
                {t("common.cancel")}
              </button>
              <button
                type="button"
                className="rounded-md border border-red-500 py-2 font-semibold text-red-500 hover:bg-red-500/10"
                onClick={() => {
                  setShowLogoutConfirm(false);
                  void logout?.();
                }}
              >
                {t("common.logout")}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
