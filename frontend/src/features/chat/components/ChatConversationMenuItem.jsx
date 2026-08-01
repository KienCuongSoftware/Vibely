import React from "react";

const CHAT_MENU_ICON_CLASS = "h-[18px] w-[18px] shrink-0";

export function ChatConversationMenuItem({
  icon,
  label,
  onClick,
  disabled = false,
  danger = false,
}) {
  const tone = danger
    ? "text-red-500"
    : disabled
      ? "text-zinc-500"
      : "text-zinc-100";
  const iconTone = danger
    ? "text-red-500"
    : disabled
      ? "text-zinc-500"
      : "text-zinc-300";

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`mt-1 flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-[15px] font-medium transition first:mt-0 ${
        disabled
          ? "cursor-not-allowed"
          : "cursor-pointer hover:bg-zinc-700"
      } ${tone}`}
    >
      <span className={`flex items-center justify-center ${iconTone}`}>{icon}</span>
      {label}
    </button>
  );
}

export { CHAT_MENU_ICON_CLASS };
