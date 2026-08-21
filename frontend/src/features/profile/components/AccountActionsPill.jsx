import React from "react";
import { useTranslation } from "react-i18next";
import { IoCashOutline, IoPhonePortraitOutline } from "react-icons/io5";
import { TooltipIconButton } from "@/shared/components/TooltipControls";

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
 * Thanh pill góc phải (desktop ≥1024px): nút xu, tải app, vạch chia, avatar / đăng nhập.
 * Ẩn hoàn toàn trên mobile — dùng bottom nav / top bar thay thế.
 */
export function AccountActionsPill({
  children,
  className = "",
  tone = "feed",
  density = "compact",
  showCoinAndApp = true,
}) {
  const { t } = useTranslation();
  const d = densityClasses[density] ?? densityClasses.compact;
  const getCoins = t("moreMenu.getCoins");
  const downloadApp = t("common.downloadApp");
  return (
    <div
      className={`hidden lg:inline-flex flex-row flex-nowrap items-center rounded-full border shadow-lg ${d.shell} leading-none ${toneClasses[tone] ?? toneClasses.feed} ${className}`}
    >
      {showCoinAndApp ? (
        <>
          <TooltipIconButton tip={getCoins} ariaLabel={getCoins} size={d.iconBtnSize}>
            <IoCashOutline className={d.icon} />
          </TooltipIconButton>
          <TooltipIconButton tip={downloadApp} ariaLabel={downloadApp} size={d.iconBtnSize}>
            <IoPhonePortraitOutline className={d.icon} />
          </TooltipIconButton>
          <div
            className={`mx-0.5 w-px shrink-0 self-center bg-zinc-600 ${d.rule}`}
            aria-hidden
          />
        </>
      ) : null}
      {children}
    </div>
  );
}
