import React, { useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ActivityPanel } from "@/features/notification/components/ActivityPanel.jsx";
import { useActivityModal } from "@/features/notification/store/ActivityModalContext.jsx";
import { useChatInboxBadge } from "@/features/chat/store/ChatInboxBadgeContext.jsx";
import { useNotificationUnread } from "@/features/notification/store/NotificationUnreadContext.jsx";
import { formatNotificationBadgeCount } from "@/features/notification/utils/notificationBadge.js";
import { SearchModal } from "@/features/search/components/SearchModal.jsx";
import { useSearchModal } from "@/features/search/store/SearchModalContext.jsx";
import { useLocale, SUPPORTED_LANGUAGES } from "@/i18n/useLocale.js";
import { useTheme } from "@/shared/theme/ThemeContext.jsx";
import { VibelyMarkIcon, VibelyWordmark } from "@/shared/components/VibelyWordmark.jsx";
import { GuestLoginTrigger } from "@/features/auth/store/GuestAuthUiContext.jsx";
import { APPEARANCE_OPTIONS } from "@/shared/theme/themeStorage.js";
import {
  IoBagHandleOutline,
  IoCashOutline,
  IoCheckmark,
  IoChevronBack,
  IoChevronForward,
  IoClose,
  IoColorWandOutline,
  IoDocumentTextOutline,
  IoGlobeOutline,
  IoLogOutOutline,
  IoMoonOutline,
  IoSunnyOutline,
  IoRadioOutline,
  IoRocketOutline,
  IoSearchOutline,
  IoSettingsOutline,
  IoTrendingUpOutline,
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
  const searchModal = useSearchModal();
  const activityModal = useActivityModal();
  const { unreadCount } = useNotificationUnread();
  const { chatInboxBadgeCount } = useChatInboxBadge();
  const openSearch = onOpenSearch ?? searchModal?.openSearch;
  const [moreOpen, setMoreOpen] = useState(false);
  const [langOpen, setLangOpen] = useState(false);
  const [themeOpen, setThemeOpen] = useState(false);
  const { preference, setPreference } = useTheme();
  const { locale, changeLanguage } = useLocale();
  const currentLangLabel = SUPPORTED_LANGUAGES.find((l) => l.code === locale)?.nativeLabel ?? locale;

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

  const closeMore = () => { setMoreOpen(false); setLangOpen(false); setThemeOpen(false); };

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
            const isActive =
              activeMenu === item.id ||
              (item.id === "activity" && activityOpen) ||
              (moreOpen && item.id === "more");
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
            return (
              <button
                key={item.id}
                type="button"
                title={label}
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
                onClick={() => handleNavClick(item)}
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
        <div className="vibely-more-panel flex h-full min-h-0 w-[min(calc(100vw-72px),340px)] shrink-0 flex-col overflow-hidden border-r border-zinc-800 text-zinc-100">
          {langOpen ? (
            <>
              <div className="flex shrink-0 items-center gap-2 border-b border-zinc-800 px-2 py-3">
                <button
                  type="button"
                  aria-label={t("nav.back")}
                  className="vibely-more-row cursor-pointer rounded-full p-2 text-zinc-300"
                  onClick={() => setLangOpen(false)}
                >
                  <IoChevronBack className="text-xl" />
                </button>
                <h2 className="text-base font-bold">{t("nav.language")}</h2>
              </div>
              <div className="scrollbar-none min-h-0 flex-1 overflow-y-auto overscroll-y-contain px-2 py-2">
                {SUPPORTED_LANGUAGES.map((lang) => (
                  <button
                    key={lang.code}
                    type="button"
                    className="vibely-more-row flex w-full cursor-pointer items-center justify-between gap-3 rounded-lg px-3 py-3 text-left text-sm text-zinc-100"
                    onClick={() => { changeLanguage(lang.code); setLangOpen(false); }}
                  >
                    <span>{lang.nativeLabel}</span>
                    {locale === lang.code ? (
                      <IoCheckmark className="text-lg text-red-500" aria-hidden />
                    ) : null}
                  </button>
                ))}
              </div>
            </>
          ) : themeOpen ? (
            <>
              <div className="flex shrink-0 items-center gap-2 border-b border-zinc-800 px-2 py-3">
                <button
                  type="button"
                  aria-label={t("nav.back")}
                  className="vibely-more-row cursor-pointer rounded-full p-2 text-zinc-300"
                  onClick={() => setThemeOpen(false)}
                >
                  <IoChevronBack className="text-xl" />
                </button>
                <h2 className="text-base font-bold">{t("appearance.darkMode")}</h2>
              </div>
              <div className="scrollbar-none min-h-0 flex-1 overflow-y-auto overscroll-y-contain px-2 py-2">
                {APPEARANCE_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    className="vibely-more-row flex w-full cursor-pointer items-center justify-between gap-3 rounded-lg px-3 py-3 text-left text-sm text-zinc-100"
                    onClick={() => { setPreference(option.value); setThemeOpen(false); }}
                  >
                    <span>{t(option.labelKey)}</span>
                    {preference === option.value ? (
                      <IoCheckmark className="text-lg text-zinc-100" aria-hidden />
                    ) : null}
                  </button>
                ))}
              </div>
            </>
          ) : (
          <>
          <div className="flex shrink-0 items-center justify-between px-4 pb-2 pt-4">
            <h2 className="text-[22px] font-bold leading-none">{t("nav.more")}</h2>
            <button
              type="button"
              aria-label={t("nav.close")}
              className="vibely-more-close flex h-9 w-9 cursor-pointer items-center justify-center rounded-full"
              onClick={closeMore}
            >
              <IoClose className="text-xl" />
            </button>
          </div>

          <div className="scrollbar-none min-h-0 flex-1 overflow-y-auto overscroll-y-contain px-2 py-3">
            <MoreSection title={t("nav.settings")}>
              <MoreRow
                icon={IoSettingsOutline}
                label={t("nav.general")}
                onClick={() => {}}
              />
              <MoreRow
                icon={IoGlobeOutline}
                label={currentLangLabel}
                trailing={<IoChevronForward className="text-zinc-500" />}
                onClick={() => setLangOpen(true)}
              />
              <MoreRow
                icon={IoMoonOutline}
                label={t("nav.darkMode")}
                trailing={<AppearanceSegment preference={preference} onChange={setPreference} />}
              />
            </MoreSection>

            <MoreSection title={t("nav.tools")}>
              <MoreRow
                icon={IoRocketOutline}
                label={t("moreMenu.studio")}
                trailing={<IoChevronForward className="text-zinc-500" />}
                onClick={() => {}}
              />
              <MoreRow
                icon={IoColorWandOutline}
                label={t("moreMenu.createEffects")}
                trailing={<IoChevronForward className="text-zinc-500" />}
                onClick={() => {}}
              />
              <MoreRow
                icon={IoTrendingUpOutline}
                label={t("moreMenu.promotePost")}
                trailing={<IoChevronForward className="text-zinc-500" />}
                onClick={() => {}}
              />
              <MoreRow
                icon={IoRadioOutline}
                label={t("moreMenu.liveTools")}
                trailing={<IoChevronForward className="text-zinc-500" />}
                onClick={() => {}}
              />
              <MoreRow
                icon={IoCashOutline}
                label={t("moreMenu.getCoins")}
                trailing={<IoChevronForward className="text-zinc-500" />}
                onClick={() => {}}
              />
              <MoreRow
                icon={IoBagHandleOutline}
                label={t("moreMenu.shop")}
                trailing={<IoChevronForward className="text-zinc-500" />}
                onClick={() => {}}
              />
            </MoreSection>

            <MoreSection title={t("moreMenu.other")}>
              {!token ? (
                <GuestLoginTrigger
                  onClick={closeMore}
                  className="vibely-more-row flex w-full cursor-pointer items-center rounded-lg px-3 py-3 text-left text-sm font-semibold text-[#FE2C55]"
                >
                  {t("nav.login")}
                </GuestLoginTrigger>
              ) : null}
              <MoreRow
                icon={IoDocumentTextOutline}
                label={t("moreMenu.support")}
                trailing={<IoChevronForward className="text-zinc-500" />}
                onClick={() => {}}
              />
              {token && onLogout ? (
                <MoreRow
                  icon={IoLogOutOutline}
                  label={t("settings.logout")}
                  onClick={() => {
                    closeMore();
                    onLogout();
                  }}
                />
              ) : null}
            </MoreSection>
          </div>
          </>
          )}
        </div>
      ) : null}
    </div>
  );
}

function MoreSection({ title, children }) {
  return (
    <div className="mb-2 border-b border-zinc-800 pb-3 last:mb-0 last:border-b-0 last:pb-0">
      <p className="px-3 py-2 text-[13px] font-semibold text-zinc-500">
        {title}
      </p>
      <div>{children}</div>
    </div>
  );
}

function AppearanceSegment({ preference, onChange }) {
  const { t } = useTranslation();
  const options = [
    { value: "system", icon: IoSettingsOutline, labelKey: "appearance.automatic" },
    { value: "dark", icon: IoMoonOutline, labelKey: "appearance.darkMode" },
    { value: "light", icon: IoSunnyOutline, labelKey: "appearance.lightMode" },
  ];
  return (
    <div className="flex overflow-hidden rounded-full bg-zinc-800 p-0.5" onClick={(e) => e.stopPropagation()}>
      {options.map((option) => {
        const Icon = option.icon;
        const active = preference === option.value;
        return (
          <button
            key={option.value}
            type="button"
            title={t(option.labelKey)}
            aria-label={t(option.labelKey)}
            className={`flex h-7 w-7 cursor-pointer items-center justify-center rounded-full ${
              active ? "bg-zinc-950 text-zinc-100" : "text-zinc-500"
            }`}
            onClick={() => onChange(option.value)}
          >
            <Icon className="text-sm" />
          </button>
        );
      })}
    </div>
  );
}

function MoreRow({ icon: Icon, label, trailing, onClick }) {
  return (
    <button
      type="button"
      className="vibely-more-row flex w-full cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5 text-left text-[15px] text-zinc-100"
      onClick={onClick}
    >
      {Icon ? <Icon className="shrink-0 text-[18px] text-zinc-300" /> : null}
      <span className="min-w-0 flex-1">{label}</span>
      {trailing ? <span className="shrink-0">{trailing}</span> : null}
    </button>
  );
}
