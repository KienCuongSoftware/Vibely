import React, { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { IoClose, IoMoonOutline, IoOptionsOutline, IoSunnyOutline } from "react-icons/io5";

const OPTIONS = [
  {
    value: "system",
    icon: IoOptionsOutline,
    titleKey: "appearance.automatic",
    descKey: "appearance.automaticDesc",
  },
  {
    value: "dark",
    icon: IoMoonOutline,
    titleKey: "appearance.darkMode",
    descKey: "appearance.darkDesc",
  },
  {
    value: "light",
    icon: IoSunnyOutline,
    titleKey: "appearance.lightMode",
    descKey: "appearance.lightDesc",
  },
];

export function AppearanceHelpModal({ open, preference, onChange, onClose }) {
  const { t } = useTranslation();

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (event) => {
      if (event.key === "Escape") onClose?.();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[280] flex items-center justify-center bg-black/45 px-4"
      role="presentation"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="appearance-help-title"
        className="relative w-full max-w-[360px] overflow-hidden rounded-2xl bg-zinc-950 p-5 shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute right-3 top-3 flex h-8 w-8 cursor-pointer items-center justify-center rounded-full text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100"
          aria-label={t("common.close")}
        >
          <IoClose className="text-xl" />
        </button>

        <h2
          id="appearance-help-title"
          className="pr-8 text-lg font-bold text-zinc-100"
        >
          {t("appearance.helpTitle")}
        </h2>
        <p className="mt-1 text-sm leading-relaxed text-zinc-400">
          {t("appearance.helpIntro")}
        </p>

        <div className="mt-4 space-y-1">
          {OPTIONS.map((option) => {
            const Icon = option.icon;
            const selected = preference === option.value;
            return (
              <button
                key={option.value}
                type="button"
                className={`flex w-full cursor-pointer items-start gap-3 rounded-xl px-3 py-3 text-left ${
                  selected ? "bg-zinc-800" : "hover:bg-zinc-800"
                }`}
                onClick={() => onChange?.(option.value)}
              >
                <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-zinc-800 text-zinc-100">
                  <Icon className="text-lg" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[15px] font-semibold text-zinc-100">
                    {t(option.titleKey)}
                  </span>
                  <span className="mt-0.5 block text-[13px] leading-snug text-zinc-400">
                    {t(option.descKey)}
                  </span>
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
