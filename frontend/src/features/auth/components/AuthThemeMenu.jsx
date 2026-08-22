import React, { useEffect, useId, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { IoArrowBack, IoCheckmark, IoMoonOutline, IoSunnyOutline } from "react-icons/io5";
import { useTheme } from "@/shared/theme/ThemeContext.jsx";
import { APPEARANCE_OPTIONS } from "@/shared/theme/themeStorage.js";

export function AuthThemeMenu() {
  const { t } = useTranslation();
  const { preference, resolved, setPreference } = useTheme();
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);
  const menuId = useId();

  useEffect(() => {
    if (!open) return undefined;
    const onPointerDown = (event) => {
      if (!rootRef.current?.contains(event.target)) setOpen(false);
    };
    const onKeyDown = (event) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        className="vibely-auth-icon-btn flex h-10 w-10 items-center justify-center rounded-full bg-zinc-800 text-zinc-200 hover:bg-zinc-700"
        aria-label={t("appearance.darkMode")}
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        onClick={() => setOpen((prev) => !prev)}
      >
        {resolved === "light" ? (
          <IoSunnyOutline className="text-xl" aria-hidden />
        ) : (
          <IoMoonOutline className="text-xl" aria-hidden />
        )}
      </button>
      {open ? (
        <div
          id={menuId}
          role="menu"
          className="vibely-auth-theme-menu absolute right-0 top-12 z-30 w-[220px] overflow-hidden rounded-xl border border-zinc-800 bg-[#1f1f1f] py-1 shadow-2xl"
        >
          <div className="flex items-center gap-1 border-b border-zinc-800 px-1 py-1">
            <button
              type="button"
              className="flex h-8 w-8 items-center justify-center rounded-full text-zinc-200 hover:bg-zinc-800"
              aria-label={t("common.back")}
              onClick={() => setOpen(false)}
            >
              <IoArrowBack className="text-lg" />
            </button>
            <p className="text-[13px] font-semibold text-zinc-100">
              {t("appearance.darkMode")}
            </p>
          </div>
          {APPEARANCE_OPTIONS.map((option) => {
            const selected = preference === option.value;
            return (
              <button
                key={option.value}
                type="button"
                role="menuitemradio"
                aria-checked={selected}
                className="flex w-full items-center justify-between px-4 py-2.5 text-left text-[13px] text-zinc-100 hover:bg-zinc-800"
                onClick={() => {
                  setPreference(option.value);
                  setOpen(false);
                }}
              >
                <span>{t(option.labelKey)}</span>
                {selected ? (
                  <IoCheckmark className="text-lg text-zinc-100" aria-hidden />
                ) : null}
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
