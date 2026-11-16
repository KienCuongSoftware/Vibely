import React from "react";
import { Link, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  IoChatbubbleEllipsesOutline,
  IoGridOutline,
  IoPeopleOutline,
  IoShieldCheckmarkOutline,
  IoShieldOutline,
  IoVideocamOutline,
} from "react-icons/io5";
import { VibelyWordmark } from "@/shared/components/VibelyWordmark.jsx";
import { useTheme } from "@/shared/theme/ThemeContext.jsx";

const ADMIN_NAV_ITEMS = [
  {
    id: "dashboard",
    to: "/admin/dashboard",
    labelKey: "admin.nav.dashboard",
    icon: IoGridOutline,
  },
  {
    id: "users",
    to: "/admin/users",
    labelKey: "admin.nav.users",
    icon: IoPeopleOutline,
  },
  {
    id: "posts",
    to: "/admin/posts",
    labelKey: "admin.nav.posts",
    icon: IoVideocamOutline,
  },
  {
    id: "moderation",
    to: "/admin/moderation",
    labelKey: "admin.nav.moderation",
    icon: IoShieldCheckmarkOutline,
  },
  {
    id: "banned",
    to: "/admin/banned-users",
    labelKey: "admin.nav.banned",
    icon: IoShieldOutline,
  },
  {
    id: "appeals",
    to: "/admin/ban-appeals",
    labelKey: "admin.nav.appeals",
    icon: IoChatbubbleEllipsesOutline,
  },
];

export function AdminSidebar({ active = "dashboard", className = "", onNavigate }) {
  const { t } = useTranslation();
  const location = useLocation();
  const { resolved } = useTheme();
  const isLight = resolved === "light";

  const asideClass = isLight
    ? "relative z-20 flex h-dvh w-[220px] shrink-0 flex-col overflow-y-auto overflow-x-hidden border-r border-zinc-200 bg-white px-3 py-4 scrollbar-none"
    : "relative z-20 flex h-dvh w-[220px] shrink-0 flex-col overflow-y-auto overflow-x-hidden border-r border-zinc-900 bg-black px-3 py-4 scrollbar-none";

  return (
    <aside className={className ? `${asideClass} ${className}` : asideClass}>
      <Link
        to="/admin/dashboard"
        onClick={() => onNavigate?.()}
        className={`mb-4 flex h-11 items-center pl-1 ${
          isLight
            ? "text-zinc-900 hover:text-black"
            : "text-zinc-100 hover:text-white"
        }`}
      >
        <VibelyWordmark
          className={`h-9 w-auto shrink-0 ${
            isLight ? "text-zinc-900" : "text-zinc-100"
          }`}
          title={t("admin.brand")}
        />
      </Link>

      <nav className="space-y-1">
        {ADMIN_NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const label = t(item.labelKey);
          const isActive =
            active === item.id ||
            location.pathname === item.to ||
            (item.to !== "/admin/dashboard" &&
              location.pathname.startsWith(`${item.to}/`));
          return (
            <Link
              key={item.id}
              to={item.to}
              onClick={() => onNavigate?.()}
              aria-label={label}
              aria-current={isActive ? "page" : undefined}
              className={`flex h-10 w-full items-center gap-2.5 rounded-lg px-3 text-sm transition ${
                isLight ? "hover:bg-zinc-100" : "hover:bg-zinc-900"
              } ${
                isActive
                  ? "font-semibold text-[#FE2C55]"
                  : isLight
                    ? "text-zinc-800"
                    : "text-zinc-100"
              }`}
            >
              <Icon className="shrink-0 text-lg" aria-hidden />
              <span className="min-w-0 truncate">{label}</span>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
