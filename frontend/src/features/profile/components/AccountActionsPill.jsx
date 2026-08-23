import React from "react";
import { useTranslation } from "react-i18next";
import { IoCashOutline, IoPhonePortraitOutline } from "react-icons/io5";

const toneClasses = {
  feed: "",
  profile: "shrink-0",
};

function HeaderLabelChip({ icon, label }) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      className="flex max-w-[10.5rem] min-w-0 cursor-pointer items-center gap-1.5 rounded-full px-2.5 py-1.5 text-[13px] font-semibold leading-none text-zinc-100 transition-colors hover:bg-zinc-800"
    >
      <span className="shrink-0 text-[16px]" aria-hidden>
        {icon}
      </span>
      <span className="min-w-0 truncate">{label}</span>
    </button>
  );
}

/**
 * Thanh pill góc phải (desktop ≥1024px): Nhận xu / Tải ứng dụng (icon + chữ i18n), avatar.
 */
export function AccountActionsPill({
  children,
  className = "",
  tone = "feed",
  showCoinAndApp = true,
}) {
  const { t } = useTranslation();
  const getCoins = t("moreMenu.getCoins");
  const downloadApp = t("common.downloadApp");
  return (
    <div
      className={`hidden lg:inline-flex max-w-[min(100%,28rem)] flex-row flex-nowrap items-center rounded-full bg-zinc-950 py-0.5 pl-0.5 pr-1 shadow-[0_2px_8px_rgba(0,0,0,0.08)] ${toneClasses[tone] ?? toneClasses.feed} ${className}`}
    >
      {showCoinAndApp ? (
        <>
          <HeaderLabelChip icon={<IoCashOutline />} label={getCoins} />
          <HeaderLabelChip icon={<IoPhonePortraitOutline />} label={downloadApp} />
          <div
            className="mx-0.5 h-6 w-px shrink-0 self-center bg-zinc-700"
            aria-hidden
          />
        </>
      ) : null}
      {children}
    </div>
  );
}
