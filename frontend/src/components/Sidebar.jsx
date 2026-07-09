import React, { useState } from "react";
import { Link } from "react-router-dom";
import { ActivityPanel } from "./activity/ActivityPanel.jsx";
import { useActivityModal } from "../state/ActivityModalContext.jsx";
import { useChatInboxBadge } from "../state/ChatInboxBadgeContext.jsx";
import { useNotificationUnread } from "../state/NotificationUnreadContext.jsx";
import { formatNotificationBadgeCount } from "../utils/notificationBadge.js";
import { useSearchModal } from "../state/SearchModalContext.jsx";
import {
  IoBagHandleOutline,
  IoCashOutline,
  IoChevronForward,
  IoClose,
  IoColorWandOutline,
  IoDocumentTextOutline,
  IoGlobeOutline,
  IoLogOutOutline,
  IoMoonOutline,
  IoRadioOutline,
  IoRocketOutline,
  IoSearchOutline,
  IoSettingsOutline,
  IoSunnyOutline,
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
  const searchModal = useSearchModal();
  const activityModal = useActivityModal();
  const { unreadCount } = useNotificationUnread();
  const { chatInboxBadgeCount } = useChatInboxBadge();
  const openSearch = onOpenSearch ?? searchModal?.openSearch;
  const [moreOpen, setMoreOpen] = useState(false);
  const [darkModeOn, setDarkModeOn] = useState(true);

  const avatarSrc =
    user?.avatarUrl && user.avatarUrl.trim()
      ? user.avatarUrl
      : "/images/users/default-avatar.jpeg";

  const activityOpen = Boolean(activityModal?.open);
  const collapsed = forceCollapsed || moreOpen || activityOpen;

  const handleNavClick = (item) => {
    if (item.id === "more") {
      activityModal?.closeActivity?.();
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
    onSelectMenu?.(item.id);
  };

  const closeMore = () => setMoreOpen(false);

  const vibelyMark = (
    <img
      src="/vibely-icon.svg"
      alt=""
      className="h-7 w-7 shrink-0"
      aria-hidden
      draggable="false"
    />
  );

  return (
    <div className="flex h-full min-h-0 shrink-0 overflow-hidden">
      <aside
        className={`flex h-full min-h-0 flex-col overflow-hidden border-r border-zinc-900 py-4 transition-[width] duration-200 ease-out ${
          collapsed ? "w-[72px] px-2" : "w-[220px] px-3"
        }`}
      >
        <Link
          to="/foryou"
          className={`mb-4 flex h-10 items-center text-center font-black tracking-tight text-zinc-100 hover:text-white ${
            collapsed ? "justify-center text-xl" : "justify-start pl-2 text-3xl"
          }`}
          onClick={() => {
            if (moreOpen) setMoreOpen(false);
          }}
        >
          {collapsed ? (
            <span className="inline-flex text-zinc-100" aria-hidden>
              {vibelyMark}
            </span>
          ) : (
            <span className="inline-flex items-baseline gap-1.5">
              <span className="inline-flex text-zinc-100" aria-hidden>
                {vibelyMark}
              </span>
              <span>Vibely</span>
            </span>
          )}
        </Link>

        {!hideSearch ? (
          collapsed ? (
            <button
              type="button"
              onClick={() => {
                activityModal?.closeActivity?.();
                openSearch?.();
              }}
              className="mb-4 flex h-10 w-full cursor-pointer items-center justify-center rounded-full bg-zinc-900 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200"
              aria-label="Tìm kiếm"
            >
              <IoSearchOutline className="text-lg" />
            </button>
          ) : (
            <button
              type="button"
              onClick={() => {
                activityModal?.closeActivity?.();
                openSearch?.();
              }}
              className="mb-4 flex h-10 w-full cursor-pointer items-center gap-2 rounded-full bg-zinc-900 px-4 text-left text-sm text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200"
            >
              <IoSearchOutline
                className="shrink-0 text-lg opacity-70"
                aria-hidden
              />
              Tìm kiếm
            </button>
          )
        ) : null}

        <nav className="space-y-1">
          {menuItems.map((item) => {
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
            return (
              <button
                key={item.id}
                type="button"
                title={collapsed ? item.label : undefined}
                aria-current={isActive ? "page" : undefined}
                className={`flex w-full cursor-pointer items-center rounded-lg ${
                  collapsed
                    ? "h-10 justify-center px-0"
                    : "h-10 gap-3 px-3 text-left"
                } ${
                  isActive
                    ? "bg-zinc-900 font-semibold text-red-500 ring-1 ring-zinc-800/80"
                    : "hover:bg-zinc-900"
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
                ) : (
                  <span className="relative inline-flex shrink-0">
                    <Icon className="text-base" />
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
                    <span className="min-w-0 flex-1">{item.label}</span>
                    {showNavBadge ? (
                      <span className="inline-flex min-w-5 shrink-0 items-center justify-center rounded-full bg-[#FE2C55] px-1.5 text-[10px] font-bold text-white">
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
              Đăng nhập để thích, bình luận và theo dõi nhà sáng tạo.
            </p>
            <Link
              to="/login"
              className="block rounded-md bg-red-600 px-3 py-2 text-center font-semibold text-white hover:bg-red-500"
            >
              Đăng nhập
            </Link>
          </div>
        ) : null}

        {!collapsed ? (
          <div className="mt-auto space-y-2 text-xs text-zinc-500">
            <p>Công ty</p>
            <p>Chương trình</p>
            <p>Điều khoản và chính sách</p>
            <p>© 2026 Vibely</p>
          </div>
        ) : null}
      </aside>

      {activityOpen ? (
        <ActivityPanel onClose={() => activityModal?.closeActivity?.()} />
      ) : null}

      {moreOpen ? (
        <div className="flex h-full min-h-0 w-[min(calc(100vw-72px),340px)] shrink-0 flex-col overflow-hidden border-r border-zinc-900 bg-zinc-950 text-zinc-100">
          <div className="flex shrink-0 items-center justify-between border-b border-zinc-800 px-4 py-3">
            <h2 className="text-lg font-bold">Thêm</h2>
            <button
              type="button"
              aria-label="Đóng"
              className="cursor-pointer rounded-full p-2 text-zinc-300 hover:bg-zinc-800 hover:text-white"
              onClick={closeMore}
            >
              <IoClose className="text-2xl" />
            </button>
          </div>

          <div className="scrollbar-none min-h-0 flex-1 overflow-y-auto overscroll-y-contain px-2 py-3">
            <MoreSection title="Cài đặt">
              <MoreRow
                icon={IoSettingsOutline}
                label="Chung"
                onClick={() => {}}
              />
              <MoreRow
                icon={IoGlobeOutline}
                label="Tiếng Việt"
                trailing={<IoChevronForward className="text-zinc-500" />}
                onClick={() => {}}
              />
              <div className="flex w-full items-center gap-3 rounded-lg px-3 py-3 hover:bg-zinc-800/90">
                <IoMoonOutline className="shrink-0 text-lg text-zinc-300" />
                <span className="flex-1 text-left text-sm">Chế độ tối</span>
                <button
                  type="button"
                  role="switch"
                  aria-checked={darkModeOn}
                  className="relative flex h-8 w-14 shrink-0 items-center rounded-full bg-zinc-700 px-1 transition-colors"
                  onClick={() => setDarkModeOn((v) => !v)}
                >
                  <span
                    className={`flex h-6 w-6 items-center justify-center rounded-full bg-zinc-900 text-xs shadow transition-transform ${
                      darkModeOn ? "translate-x-6" : "translate-x-0"
                    }`}
                  >
                    {darkModeOn ? (
                      <IoMoonOutline className="text-zinc-200" />
                    ) : (
                      <IoSunnyOutline className="text-amber-300" />
                    )}
                  </span>
                </button>
              </div>
            </MoreSection>

            <MoreSection title="Công cụ">
              <MoreRow
                icon={IoRocketOutline}
                label="Vibaly Studio"
                trailing={<IoChevronForward className="text-zinc-500" />}
                onClick={() => {}}
              />
              <MoreRow
                icon={IoColorWandOutline}
                label="Tạo hiệu ứng Vibaly"
                trailing={<IoChevronForward className="text-zinc-500" />}
                onClick={() => {}}
              />
              <MoreRow
                icon={IoTrendingUpOutline}
                label="Quảng bá bài đăng"
                trailing={<IoChevronForward className="text-zinc-500" />}
                onClick={() => {}}
              />
              <MoreRow
                icon={IoRadioOutline}
                label="Công cụ phát LIVE"
                trailing={<IoChevronForward className="text-zinc-500" />}
                onClick={() => {}}
              />
              <MoreRow
                icon={IoCashOutline}
                label="Nhận Xu"
                trailing={<IoChevronForward className="text-zinc-500" />}
                onClick={() => {}}
              />
              <MoreRow
                icon={IoBagHandleOutline}
                label="Bán hàng trên Vibaly Shop"
                trailing={<IoChevronForward className="text-zinc-500" />}
                onClick={() => {}}
              />
            </MoreSection>

            <MoreSection title="Khác">
              {!token ? (
                <Link
                  to="/login"
                  onClick={closeMore}
                  className="flex w-full cursor-pointer items-center justify-center rounded-lg px-3 py-3 text-sm font-semibold text-red-400 hover:bg-zinc-800/90"
                >
                  Đăng nhập
                </Link>
              ) : null}
              <MoreRow
                icon={IoDocumentTextOutline}
                label="Hỗ trợ"
                trailing={<IoChevronForward className="text-zinc-500" />}
                onClick={() => {}}
              />
              {token && onLogout ? (
                <MoreRow
                  icon={IoLogOutOutline}
                  label="Đăng xuất"
                  onClick={() => {
                    closeMore();
                    onLogout();
                  }}
                />
              ) : null}
            </MoreSection>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function MoreSection({ title, children }) {
  return (
    <div className="mb-5">
      <p className="px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-zinc-500">
        {title}
      </p>
      <div className="space-y-0.5">{children}</div>
    </div>
  );
}

function MoreRow({ icon: Icon, label, trailing, onClick }) {
  return (
    <button
      type="button"
      className="flex w-full cursor-pointer items-center gap-3 rounded-lg px-3 py-3 text-left text-sm text-zinc-100 hover:bg-zinc-800/90"
      onClick={onClick}
    >
      {Icon ? <Icon className="shrink-0 text-lg text-zinc-300" /> : null}
      <span className="min-w-0 flex-1">{label}</span>
      {trailing ? <span className="shrink-0">{trailing}</span> : null}
    </button>
  );
}
