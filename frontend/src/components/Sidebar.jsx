import React from "react";
import { Link } from "react-router-dom";

/**
 * Sidebar trái dùng chung cho FeedPage và ProfilePage.
 * - Nhận menu items và trạng thái activeMenu từ component cha.
 * - Không chứa logic video/feed; chỉ render navigation + login prompt.
 */
export function Sidebar({ menuItems, activeMenu, onSelectMenu, token, user }) {
  const avatarSrc =
    user?.avatarUrl && user.avatarUrl.trim()
      ? user.avatarUrl
      : "/images/users/default-avatar.jpeg";

  return (
    <aside className="flex w-72 flex-col border-r border-zinc-900 px-4 py-5">
      <h1 className="mb-5 text-3xl font-black tracking-tight">Vibely</h1>
      <div className="mb-5 rounded-full bg-zinc-900 px-4 py-2 text-sm text-zinc-400">
        Tìm kiếm
      </div>

      <nav className="space-y-1">
        {menuItems.map((item) => {
          const isActive = activeMenu === item.id;
          const Icon = item.icon;
          const useProfileAvatarIcon = token && item.id === "profile";
          return (
            <button
              key={item.id}
              type="button"
              className={`flex w-full cursor-pointer items-center gap-3 rounded-lg px-3 py-2 text-left ${
                isActive ? "bg-zinc-900 font-semibold text-red-500" : "hover:bg-zinc-900"
              }`}
              onClick={() => onSelectMenu?.(item.id)}
            >
              {useProfileAvatarIcon ? (
                <img
                  className="h-6 w-6 rounded-full object-cover"
                  src={avatarSrc}
                  alt="avatar menu hồ sơ"
                  loading="eager"
                  referrerPolicy="no-referrer"
                  onError={(e) => {
                    e.currentTarget.src = "/images/users/default-avatar.jpeg";
                  }}
                />
              ) : (
                <Icon className="text-base" />
              )}
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>

      {!token ? (
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

      <div className="mt-auto space-y-2 text-xs text-zinc-500">
        <p>Công ty</p>
        <p>Chương trình</p>
        <p>Điều khoản và chính sách</p>
        <p>© 2026 Vibely</p>
      </div>
    </aside>
  );
}

