import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ActivityPanel } from "@/features/notification/components/ActivityPanel.jsx";
import { useActivityModal } from "@/features/notification/store/ActivityModalContext.jsx";
import { useChatInboxBadge } from "@/features/chat/store/ChatInboxBadgeContext.jsx";
import { useNotificationUnread } from "@/features/notification/store/NotificationUnreadContext.jsx";
import { formatNotificationBadgeCount } from "@/features/notification/utils/notificationBadge.js";
import { SearchModal } from "@/features/search/components/SearchModal.jsx";
import { useSearchModal } from "@/features/search/store/SearchModalContext.jsx";
import { SidebarMorePanel } from "@/shared/components/SidebarMorePanel.jsx";
import { VibelyMarkIcon, VibelyWordmark } from "@/shared/components/VibelyWordmark.jsx";
import { GuestLoginTrigger } from "@/features/auth/store/GuestAuthUiContext.jsx";
import { UploadTypeFlyout } from "@/features/upload/components/UploadTypeFlyout.jsx";
import { goStudioUpload } from "@/shared/utils/sidebarNavigation.js";
import {
  IoSearchOutline,
} from "react-icons/io5";

export function Sidebar({
  menuItems,
  activeMenu,
  onSelectMenu,
  token,
  user,
  onLogout,
  forceCollapsed = false,
  hideSearch = false,
  onOpenSearch,
}) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const searchModal = useSearchModal();
  const activityModal = useActivityModal();
  const { unreadCount } = useNotificationUnread();
  const { chatInboxBadgeCount } = useChatInboxBadge();
  const openSearch = onOpenSearch ?? searchModal?.openSearch;
  const [moreOpen, setMoreOpen] = useState(false);

  const avatarSrc =
    user?.avatarUrl && user.avatarUrl.trim()
      ? user.avatarUrl
      : "/images/users/default-avatar.jpeg";

  const activityOpen = Boolean(activityModal?.open);
  const searchOpen = Boolean(searchModal?.open);
  const collapsed =
    forceCollapsed || moreOpen || activityOpen || searchOpen;

  const handleOpenSearch = () => {
    if (moreOpen) setMoreOpen(false);
    activityModal?.closeActivity?.();
    openSearch?.();
  };

  const handleNavClick = (item) => {
    if (item.id === "more") {
      activityModal?.closeActivity?.();
      searchModal?.closeSearch?.();
      setMoreOpen((prev) => !prev);
      return;
    }
    if (item.id === "activity") {
      if (moreOpen) setMoreOpen(false);
      searchModal?.closeSearch?.();
      activityModal?.toggleActivity?.();
      return;
    }
    if (moreOpen) setMoreOpen(false);
    if (activityModal?.open) activityModal.closeActivity?.();
    if (searchOpen) searchModal?.closeSearch?.();
    onSelectMenu?.(item.id);
  };

  const closeMore = () => {
    setMoreOpen(false);
  };

  return (
    <div className="flex h-full min-h-0 shrink-0 overflow-hidden">
      <aside
        className={`flex h-full min-h-0 flex-col overflow-hidden border-r border-zinc-900 py-4 transition-[width] duration-200 ease-out ${
          collapsed ? "w-[72px] px-2" : "w-[220px] px-3"
        }`}
      >
        <Link
          to="/"
          className={`mb-4 flex h-11 items-center text-zinc-100 hover:text-white ${
            collapsed ? "justify-center" : "justify-start pl-1"
          }`}
          onClick={() => {
            if (moreOpen) setMoreOpen(false);
          }}
        >
          {collapsed ? (
            <VibelyMarkIcon className="h-7 w-7 shrink-0 text-zinc-100" />
          ) : (
            <VibelyWordmark className="h-9 w-auto shrink-0 text-zinc-100" />
          )}
        </Link>

        {!hideSearch ? (
          collapsed ? (
            <button
              type="button"
              onClick={handleOpenSearch}
              aria-pressed={searchOpen}
              className={`mb-4 flex h-10 w-full cursor-pointer items-center justify-center rounded-full ${
                searchOpen
                  ? "bg-zinc-900 text-red-500 ring-1 ring-zinc-800/80"
                  : "bg-zinc-900 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200"
              }`}
              aria-label={t("nav.search")}
            >
              <IoSearchOutline className="text-lg" />
            </button>
          ) : (
            <button
              type="button"
              onClick={handleOpenSearch}
              aria-pressed={searchOpen}
              className="mb-4 flex h-10 w-full cursor-pointer items-center gap-2 rounded-full bg-zinc-900 px-4 text-left text-sm text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200"
            >
              <IoSearchOutline
                className="shrink-0 text-lg opacity-70"
                aria-hidden
              />
              {t("nav.search")}
            </button>
          )
        ) : null}

        <nav className="space-y-1">
          {menuItems.map((item) => {
            const label = t(item.labelKey || item.label);
            const isActive = moreOpen
              ? item.id === "more"
              : item.id === "activity" && activityOpen
                ? true
                : activeMenu === item.id;
            const Icon = item.icon;
            const useProfileAvatarIcon = token && item.id === "profile";
            const showActivityBadge =
              token && item.id === "activity" && unreadCount > 0;
            const showMessagesBadge =
              token && item.id === "messages" && chatInboxBadgeCount > 0;
            const navBadgeLabel = formatNotificationBadgeCount(
              showActivityBadge ? unreadCount : chatInboxBadgeCount,
            );
            const showNavBadge = showActivityBadge || showMessagesBadge;
            const isUpload = item.id === "upload";
            const navButton = (
              <button
                key={isUpload ? undefined : item.id}
                type="button"
                title={collapsed ? label : undefined}
                aria-label={label}
                aria-current={isActive ? "page" : undefined}
                className={`flex w-full cursor-pointer flex-nowrap items-center rounded-lg hover:bg-zinc-900 ${
                  collapsed
                    ? "h-10 justify-center px-0"
                    : "h-10 gap-2.5 px-3 text-left"
                } ${
                  isActive
                    ? "font-semibold text-[#FE2C55]"
                    : "text-zinc-100"
                }`}
                onClick={() => {
                  if (isUpload) return
                  handleNavClick(item)
                }}
              >
                {useProfileAvatarIcon ? (
                  <img
                    className="h-6 w-6 shrink-0 rounded-full object-cover"
                    src={avatarSrc}
                    alt=""
                    loading="eager"
                    referrerPolicy="no-referrer"
                    onError={(e) => {
                      e.currentTarget.src = "/images/users/default-avatar.jpeg";
                    }}
                  />
                ) : isUpload ? (
                  <span
                    className={`inline-grid shrink-0 place-items-center rounded-[6px] border border-current ${
                      collapsed ? "h-7 w-7" : "h-6 w-6"
                    }`}
                    aria-hidden
                  >
                    {/* Text "+" sits low on the baseline — nudge up for optical center */}
                    <span className="-translate-y-[1.5px] text-[18px] font-semibold leading-none">
                      +
                    </span>
                  </span>
                ) : (
                  <span className="relative inline-flex shrink-0">
                    <Icon className="text-[22px]" />
                    {showNavBadge && collapsed ? (
                      <span
                        className="absolute -right-1.5 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-[#FE2C55] px-0.5 text-[9px] font-bold leading-none text-white"
                        aria-hidden
                      >
                        {navBadgeLabel}
                      </span>
                    ) : null}
                  </span>
                )}
                {!collapsed ? (
                  <>
                    <span className="min-w-0 flex-1 overflow-hidden text-ellipsis whitespace-nowrap break-keep text-sm leading-none">
                      {label}
                    </span>
                    {showNavBadge ? (
                      <span className="inline-flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-[#FE2C55] px-1.5 text-[10px] font-bold leading-none text-white">
                        {navBadgeLabel}
                      </span>
                    ) : null}
                  </>
                ) : null}
              </button>
            );
            if (!isUpload) {
              return React.cloneElement(navButton, { key: item.id });
            }
            return (
              <UploadTypeFlyout
                key={item.id}
                onPickVideo={() => goStudioUpload(navigate, token, 'video')}
                onPickPhoto={() => goStudioUpload(navigate, token, 'photo')}
              >
                {({ open, menuId, toggle }) =>
                  React.cloneElement(navButton, {
                    'aria-haspopup': 'menu',
                    'aria-expanded': open,
                    'aria-controls': menuId,
                    onClick: toggle,
                  })
                }
              </UploadTypeFlyout>
            );
          })}
        </nav>

        {!token && !collapsed ? (
          <div className="my-5 border-t border-zinc-900 pt-4">
            <p className="mb-3 text-sm text-zinc-400">
              {t("nav.loginPrompt")}
            </p>
            <GuestLoginTrigger className="flex h-11 w-full items-center justify-center rounded-md bg-red-600 px-4 text-[15px] font-semibold text-white hover:bg-red-500">
              {t("nav.login")}
            </GuestLoginTrigger>
          </div>
        ) : null}

        {!collapsed ? (
          <div className="mt-auto space-y-2 text-xs text-zinc-500">
            <p>{t("nav.company")}</p>
            <p>{t("nav.program")}</p>
            <p>{t("nav.termsAndPolicies")}</p>
            <p>{t("nav.copyright")}</p>
          </div>
        ) : null}
      </aside>

      {searchOpen ? (
        <SearchModal open onClose={() => searchModal?.closeSearch?.()} />
      ) : null}

      {activityOpen ? (
        <ActivityPanel onClose={() => activityModal?.closeActivity?.()} />
      ) : null}

      {moreOpen ? (
        <SidebarMorePanel
          onClose={closeMore}
          token={token}
          onLogout={onLogout}
        />
      ) : null}
    </div>
  );
}
