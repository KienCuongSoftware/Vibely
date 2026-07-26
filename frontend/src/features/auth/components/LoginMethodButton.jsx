import React from "react";

/**
 * OAuth / email login row with optional "Dùng gần đây" badge (TikTok-style).
 */
export function LoginMethodButton({
  label,
  icon,
  onClick,
  recentlyUsed = false,
}) {
  return (
    <button
      type="button"
      className="relative flex h-[52px] w-full min-h-[52px] items-center gap-4 rounded-xl bg-zinc-800 px-4 text-left text-sm hover:bg-zinc-700"
      onClick={onClick}
      aria-label={recentlyUsed ? `${label}, Dùng gần đây` : label}
    >
      {recentlyUsed ? (
        <span
          className="pointer-events-none absolute -right-0.5 -top-2 z-10 rounded-full bg-cyan-300 px-2.5 py-0.5 text-[10px] font-semibold leading-tight text-black shadow-md"
          aria-hidden
        >
          Dùng gần đây
        </span>
      ) : null}
      <span className="flex h-10 w-10 shrink-0 items-center justify-center">
        {icon}
      </span>
      <span>{label}</span>
    </button>
  );
}
