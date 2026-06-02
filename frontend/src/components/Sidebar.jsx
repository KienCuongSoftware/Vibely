import React, { useState } from "react";
import { Link } from "react-router-dom";
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
  onOpenSearch,
}) {
  const searchModal = useSearchModal();
  const openSearch = onOpenSearch ?? searchModal?.openSearch;
  const [moreOpen, setMoreOpen] = useState(false);
  const [darkModeOn, setDarkModeOn] = useState(true);

  const avatarSrc =
    user?.avatarUrl && user.avatarUrl.trim()
      ? user.avatarUrl
      : "/images/users/default-avatar.jpeg";

  const collapsed = forceCollapsed || moreOpen;

  const handleNavClick = (item) => {
    if (item.id === "more") {
      setMoreOpen((prev) => !prev);
      return;
    }
    if (moreOpen) setMoreOpen(false);
    onSelectMenu?.(item.id);
  };

  const closeMore = () => setMoreOpen(false);

  const vibelyMark = (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="26"
      height="28"
      viewBox="0 0 26 28"
      fill="none"
      aria-hidden
    >
      <path d="M24.0277 7.46994V6.64955C22.7751 6.56126 21.4635 6.16762 20.3102 5.40885C21.3716 6.50147 22.6941 7.16643 24.0277 7.46994ZM12.6452 0V18.3401C12.6452 20.7433 10.9153 22.2884 8.81185 22.2884C8.11378 22.2884 7.45158 22.1256 6.87584 21.8249C7.60702 22.7565 8.76035 23.2918 10.0259 23.2918C12.1293 23.2918 13.8593 21.7467 13.8593 19.3416V1.00157H17.1933C17.1022 0.682429 17.0277 0.348572 16.9707 0H12.6452ZM9.91 10.6623V9.75359C9.48877 9.68369 9.06753 9.6607 8.71896 9.6607C3.9732 9.6607 0 13.4628 0 18.1773C0 21.2721 1.50926 23.9181 3.80213 25.4844C2.20457 23.9016 1.21403 21.6869 1.21403 19.1788C1.21403 14.4717 5.17435 10.6724 9.91 10.6623Z" fill="#2DCCD3" />
      <path d="M20.3092 5.41015C19.2837 4.35708 18.5011 2.90669 18.1828 1.00195H17.1923C17.7579 3.06028 18.9223 4.49687 20.3092 5.41015ZM24.0267 10.9432C22.1008 10.9432 20.278 10.5762 18.6721 9.49645C20.5419 11.3635 22.8109 11.9466 25.2408 11.9466V7.65242C24.8407 7.62575 24.4314 7.56597 24.0267 7.47124V10.9432ZM6.87486 21.8262C6.35889 21.175 6.05078 20.3326 6.05078 19.3429C6.05078 16.5672 8.22409 15.1003 11.1221 15.4047V10.7555C10.7009 10.6856 10.2797 10.6627 9.92925 10.6627H9.90902V14.4004C7.01097 14.0978 4.83767 15.5629 4.83767 18.3404C4.83767 19.9647 5.6691 21.1971 6.87486 21.8262ZM17.4581 18.0388C17.4581 23.8955 12.9708 26.9987 8.74097 26.9987C6.9098 26.9987 5.20924 26.4468 3.80115 25.4857C5.38215 27.052 7.55821 28.0002 9.955 28.0002C14.1848 28.0002 18.6721 24.8971 18.6721 19.0403V9.49645C18.2509 9.21226 17.8462 8.88116 17.4581 8.49396V18.0388Z" fill="#F1204A" />
      <path d="M17.1933 1.00195H13.8593V19.342C13.8593 21.7471 12.1293 23.2922 10.0259 23.2922C8.76037 23.2922 7.60704 22.756 6.87586 21.8253C5.6701 21.1971 4.83868 19.9647 4.83868 18.3404C4.83868 15.5629 7.01198 14.0978 9.91002 14.4004V10.6627C5.17437 10.6728 1.21313 14.473 1.21313 19.1792C1.21313 21.6873 2.20367 23.902 3.80123 25.4848C5.20932 26.445 6.90989 26.9977 8.74105 26.9977C12.9709 26.9977 17.4582 23.8946 17.4582 18.0379V8.49304C17.8463 8.88024 18.251 9.21226 18.6722 9.49645C20.278 10.5762 22.1009 10.9432 24.0268 10.9432V7.47124C22.6932 7.16865 21.3697 6.50278 20.3093 5.41015C18.9224 4.49688 17.7589 3.0612 17.1933 1.00195Z" fill="currentColor" />
    </svg>
  );

  return (
    <div className="flex h-screen min-h-0 shrink-0 overflow-hidden">
      <aside
        className={`flex h-full min-h-0 flex-col overflow-hidden border-r border-zinc-900 py-5 transition-[width] duration-200 ease-out ${
          collapsed ? "w-[72px] px-2" : "w-72 px-4"
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

        {collapsed ? (
          <button
            type="button"
            onClick={() => openSearch?.()}
            className="mb-4 flex h-10 w-full cursor-pointer items-center justify-center rounded-full bg-zinc-900 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200"
            aria-label="Tìm kiếm"
          >
            <IoSearchOutline className="text-lg" />
          </button>
        ) : (
          <button
            type="button"
            onClick={() => openSearch?.()}
            className="mb-4 flex h-10 w-full cursor-pointer items-center gap-2 rounded-full bg-zinc-900 px-4 text-left text-sm text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200"
          >
            <IoSearchOutline
              className="shrink-0 text-lg opacity-70"
              aria-hidden
            />
            Tìm kiếm
          </button>
        )}

        <nav className="space-y-1">
          {menuItems.map((item) => {
            const isActive =
              activeMenu === item.id || (moreOpen && item.id === "more");
            const Icon = item.icon;
            const useProfileAvatarIcon = token && item.id === "profile";
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
                  <Icon className="shrink-0 text-base" />
                )}
                {!collapsed ? <span>{item.label}</span> : null}
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
