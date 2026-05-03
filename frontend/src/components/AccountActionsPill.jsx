import React from "react";
import { IoCashOutline, IoPhonePortraitOutline } from "react-icons/io5";
import { TooltipIconButton } from "./TooltipControls";

const toneClasses = {
  feed: "border-zinc-800 bg-zinc-900/95",
  profile: "shrink-0 border-zinc-700 bg-zinc-800/95",
};

/** Cùng một density để feed / hồ sơ không lệch kích thước (pixel). */
const densityClasses = {
  comfortable: {
    shell: "gap-0.5 px-1 py-1 text-sm",
    icon: "text-[17px]",
    rule: "h-6",
    iconBtnSize: "md",
  },
  compact: {
    shell: "gap-px px-[5px] py-[5px] text-xs leading-none",
    icon: "text-[15px]",
    rule: "h-[22px]",
    iconBtnSize: "sm",
  },
};

/**
 * Thanh pill góc phải: nút xu, tải app, vạch chia, và vùng tuỳ chỉnh (đăng nhập / avatar).
 */
export function AccountActionsPill({
  children,
  className = "",
  tone = "feed",
  density = "compact",
}) {
  const d = densityClasses[density] ?? densityClasses.compact;
  return (
    <div
      className={`flex items-center rounded-full border shadow-lg ${d.shell} leading-none ${toneClasses[tone] ?? toneClasses.feed} ${className}`}
    >
      <TooltipIconButton
        tip="Nhận xu"
        ariaLabel="Nhận xu"
        size={d.iconBtnSize}
      >
        <IoCashOutline className={d.icon} />
      </TooltipIconButton>
      <TooltipIconButton
        tip="Tải ứng dụng"
        ariaLabel="Tải ứng dụng"
        size={d.iconBtnSize}
      >
        <IoPhonePortraitOutline className={d.icon} />
      </TooltipIconButton>
      <div
        className={`mx-0.5 w-px shrink-0 self-center bg-zinc-600 ${d.rule}`}
        aria-hidden
      />
      {children}
    </div>
  );
}
