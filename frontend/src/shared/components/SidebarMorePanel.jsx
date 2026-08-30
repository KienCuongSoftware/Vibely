import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useLocale, SUPPORTED_LANGUAGES } from "@/i18n/useLocale.js";
import { useTheme } from "@/shared/theme/ThemeContext.jsx";
import { APPEARANCE_OPTIONS } from "@/shared/theme/themeStorage.js";
import { AppearanceHelpModal } from "@/shared/theme/AppearanceHelpModal.jsx";
import { TooltipHoverWrap } from "@/shared/components/TooltipControls.jsx";
import { buildStudioHomeLoginHref } from "@/features/auth/utils/loginRedirect.js";
import {
  IoBagHandleOutline,
  IoCheckmark,
  IoChevronBack,
  IoChevronForward,
  IoClipboardOutline,
  IoClose,
  IoColorWandOutline,
  IoDesktopOutline,
  IoLanguageOutline,
  IoLogOutOutline,
  IoMoonOutline,
  IoOptionsOutline,
  IoRocketOutline,
  IoSettingsOutline,
  IoSunnyOutline,
} from "react-icons/io5";

function MoreSection({ title, children }) {
  return (
    <div className="mb-2 border-b border-zinc-800 pb-3 last:mb-0 last:border-b-0 last:pb-0">
      <p className="px-3 py-2 text-[13px] font-semibold text-zinc-500">{title}</p>
      <div>{children}</div>
    </div>
  );
}

function AppearanceSegment({ preference, onChange }) {
  const { t } = useTranslation();
  const options = [
    { value: "system", icon: IoOptionsOutline, labelKey: "appearance.automatic" },
    { value: "dark", icon: IoMoonOutline, labelKey: "appearance.darkMode" },
    { value: "light", icon: IoSunnyOutline, labelKey: "appearance.lightMode" },
  ];
  return (
    <div className="flex rounded-full bg-zinc-800 p-0.5" onClick={(e) => e.stopPropagation()}>
      {options.map((option) => {
        const Icon = option.icon;
        const active = preference === option.value;
        return (
          <TooltipHoverWrap
            key={option.value}
            tip={t(option.labelKey)}
            hoverOnly
            placement="top"
            className="relative"
          >
            <button
              type="button"
              aria-label={t(option.labelKey)}
              className={`flex h-7 w-7 cursor-pointer items-center justify-center rounded-full ${
                active ? "bg-zinc-950 text-zinc-100" : "text-zinc-500"
              }`}
              onClick={() => onChange(option.value)}
            >
              <Icon className="text-sm" />
            </button>
          </TooltipHoverWrap>
        );
      })}
    </div>
  );
}

function MoreRow({ icon: Icon, label, trailing, onClick }) {
  return (
    <button
      type="button"
      className="vibely-more-row flex w-full cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5 text-left text-[15px] text-zinc-100"
      onClick={onClick}
    >
      {Icon ? <Icon className="shrink-0 text-[18px] text-zinc-300" /> : null}
      <span className="min-w-0 flex-1">{label}</span>
      {trailing ? <span className="shrink-0">{trailing}</span> : null}
    </button>
  );
}

/**
 * Panel "Thêm" dùng chung — sidebar chính và LIVE sidebar.
 */
export function SidebarMorePanel({ onClose, token, onLogout, showTools = true }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { preference, setPreference } = useTheme();
  const { locale, changeLanguage } = useLocale();
  const [langOpen, setLangOpen] = useState(false);
  const [themeOpen, setThemeOpen] = useState(false);
  const [appearanceHelpOpen, setAppearanceHelpOpen] = useState(false);

  const currentLangLabel =
    SUPPORTED_LANGUAGES.find((l) => l.code === locale)?.nativeLabel ?? locale;

  const handleClose = () => {
    setLangOpen(false);
    setThemeOpen(false);
    setAppearanceHelpOpen(false);
    onClose?.();
  };

  return (
    <>
      <div className="vibely-more-panel flex h-full min-h-0 w-[min(calc(100vw-72px),340px)] shrink-0 flex-col overflow-hidden border-r border-zinc-800 text-zinc-100">
        {langOpen ? (
          <>
            <div className="flex shrink-0 items-center gap-2 border-b border-zinc-800 px-2 py-3">
              <button
                type="button"
                aria-label={t("nav.back")}
                className="vibely-more-row cursor-pointer rounded-full p-2 text-zinc-300"
                onClick={() => setLangOpen(false)}
              >
                <IoChevronBack className="text-xl" />
              </button>
              <h2 className="text-base font-bold">{t("nav.language")}</h2>
            </div>
            <div className="scrollbar-none min-h-0 flex-1 overflow-y-auto overscroll-y-contain px-2 py-2">
              {SUPPORTED_LANGUAGES.map((lang) => (
                <button
                  key={lang.code}
                  type="button"
                  className="vibely-more-row flex w-full cursor-pointer items-center justify-between gap-3 rounded-lg px-3 py-3 text-left text-sm text-zinc-100"
                  onClick={() => {
                    changeLanguage(lang.code);
                    setLangOpen(false);
                  }}
                >
                  <span>{lang.nativeLabel}</span>
                  {locale === lang.code ? (
                    <IoCheckmark className="text-lg text-red-500" aria-hidden />
                  ) : null}
                </button>
              ))}
            </div>
          </>
        ) : themeOpen ? (
          <>
            <div className="flex shrink-0 items-center gap-2 border-b border-zinc-800 px-2 py-3">
              <button
                type="button"
                aria-label={t("nav.back")}
                className="vibely-more-row cursor-pointer rounded-full p-2 text-zinc-300"
                onClick={() => setThemeOpen(false)}
              >
                <IoChevronBack className="text-xl" />
              </button>
              <h2 className="text-base font-bold">{t("appearance.darkMode")}</h2>
            </div>
            <div className="scrollbar-none min-h-0 flex-1 overflow-y-auto overscroll-y-contain px-2 py-2">
              {APPEARANCE_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  className="vibely-more-row flex w-full cursor-pointer items-center justify-between gap-3 rounded-lg px-3 py-3 text-left text-sm text-zinc-100"
                  onClick={() => {
                    setPreference(option.value);
                    setThemeOpen(false);
                  }}
                >
                  <span>{t(option.labelKey)}</span>
                  {preference === option.value ? (
                    <IoCheckmark className="text-lg text-zinc-100" aria-hidden />
                  ) : null}
                </button>
              ))}
            </div>
          </>
        ) : (
          <>
            <div className="flex shrink-0 items-center justify-between px-4 pb-2 pt-4">
              <h2 className="text-[22px] font-bold leading-none">{t("nav.more")}</h2>
              <button
                type="button"
                aria-label={t("nav.close")}
                className="vibely-more-close flex h-9 w-9 cursor-pointer items-center justify-center rounded-full"
                onClick={handleClose}
              >
                <IoClose className="text-xl" />
              </button>
            </div>

            <div className="scrollbar-none min-h-0 flex-1 overflow-y-auto overscroll-y-contain px-2 py-3">
              <MoreSection title={t("nav.settings")}>
                <MoreRow
                  icon={IoSettingsOutline}
                  label={t("settings.title")}
                  trailing={<IoChevronForward className="text-zinc-500" />}
                  onClick={() => {
                    handleClose();
                    if (!token) {
                      navigate("/login");
                      return;
                    }
                    navigate("/settings");
                  }}
                />
                <MoreRow
                  icon={IoLanguageOutline}
                  label={currentLangLabel}
                  trailing={<IoChevronForward className="text-zinc-500" />}
                  onClick={() => setLangOpen(true)}
                />
                <MoreRow
                  icon={IoMoonOutline}
                  label={t("nav.darkMode")}
                  trailing={
                    <AppearanceSegment preference={preference} onChange={setPreference} />
                  }
                  onClick={() => setAppearanceHelpOpen(true)}
                />
              </MoreSection>

              {showTools ? (
                <MoreSection title={t("nav.tools")}>
                  <MoreRow
                    icon={IoRocketOutline}
                    label={t("moreMenu.studio")}
                    onClick={() => {
                      handleClose();
                      if (!token) {
                        navigate(buildStudioHomeLoginHref());
                        return;
                      }
                      navigate("/vibelystudio");
                    }}
                  />
                  <MoreRow
                    icon={IoColorWandOutline}
                    label={t("moreMenu.createEffects")}
                    onClick={() => {}}
                  />
                  <MoreRow
                    icon={IoDesktopOutline}
                    label={t("moreMenu.liveTools")}
                    trailing={<IoChevronForward className="text-zinc-500" />}
                    onClick={() => {}}
                  />
                  <MoreRow
                    icon={IoBagHandleOutline}
                    label={t("moreMenu.shop")}
                    onClick={() => {}}
                  />
                </MoreSection>
              ) : null}

              <MoreSection title={t("moreMenu.other")}>
                <MoreRow
                  icon={IoClipboardOutline}
                  label={t("moreMenu.support")}
                  onClick={() => {
                    handleClose();
                    navigate("/support");
                  }}
                />
                {token && onLogout ? (
                  <MoreRow
                    icon={IoLogOutOutline}
                    label={t("settings.logout")}
                    onClick={() => {
                      handleClose();
                      onLogout();
                    }}
                  />
                ) : null}
              </MoreSection>
            </div>
          </>
        )}
      </div>

      <AppearanceHelpModal
        open={appearanceHelpOpen}
        preference={preference}
        onChange={setPreference}
        onClose={() => setAppearanceHelpOpen(false)}
      />
    </>
  );
}
