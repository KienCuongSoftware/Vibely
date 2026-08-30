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
      className="vibely-account-actions-chip flex max-w-[10.5rem] min-w-0 cursor-pointer items-center gap-1.5 rounded-full px-2.5 py-2 text-[13px] font-semibold leading-none transition-colors"
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
      className={`vibely-account-actions-pill hidden lg:inline-flex max-w-[min(100%,28rem)] flex-row flex-nowrap items-center rounded-full py-1.5 pl-1 pr-1.5 ${toneClasses[tone] ?? toneClasses.feed} ${className}`}
    >
      {showCoinAndApp ? (
        <>
          <HeaderLabelChip icon={<IoCashOutline />} label={getCoins} />
          <HeaderLabelChip icon={<IoPhonePortraitOutline />} label={downloadApp} />
          <div
            className="vibely-account-actions-divider mx-0.5 h-6 w-px shrink-0 self-center"
            aria-hidden
          />
        </>
      ) : null}
      {children}
    </div>
  );
}
