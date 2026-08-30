import React, { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { buildProfilePath } from '@/features/profile/utils/buildProfilePath.js'
import { useLocale } from '@/i18n/useLocale'
import { useTheme } from '@/shared/theme/ThemeContext.jsx'
import { APPEARANCE_OPTIONS } from '@/shared/theme/themeStorage.js'
import {
  IoCashOutline,
  IoCheckmark,
  IoChevronBack,
  IoGlobeOutline,
  IoHelpCircleOutline,
  IoLogOutOutline,
  IoMoonOutline,
  IoPerson,
  IoRocketOutline,
  IoSettingsOutline,
} from 'react-icons/io5'

function MenuRow({ as: Component = 'button', className = '', children, ...props }) {
  return (
    <Component
      type={Component === 'button' ? 'button' : undefined}
      className={`vibely-account-avatar-menu-item flex w-full items-center gap-3 px-4 py-3 text-sm text-zinc-200 hover:bg-zinc-800/80 ${className}`}
      {...props}
    >
      {children}
    </Component>
  )
}

export function AccountAvatarMenu({
  open,
  onClose,
  user,
  token,
  onLogout,
  onOpenSettings,
  className = 'absolute right-0 top-11 z-50',
}) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { locale, changeLanguage, languages } = useLocale()
  const { preference, setPreference } = useTheme()
  const [langOpen, setLangOpen] = useState(false)
  const [themeOpen, setThemeOpen] = useState(false)

  useEffect(() => {
    if (!open) {
      setLangOpen(false)
      setThemeOpen(false)
    }
  }, [open])

  if (!open) return null

  const closeAll = () => {
    setLangOpen(false)
    setThemeOpen(false)
    onClose?.()
  }

  const handleOpenSettings = () => {
    closeAll()
    if (onOpenSettings) {
      onOpenSettings()
      return
    }
    navigate('/settings')
  }

  return (
    <div
      className={`${className} flex max-h-[calc(100dvh-72px)] w-[280px] flex-col overflow-hidden rounded-xl border border-zinc-800 bg-zinc-950 shadow-2xl`}
      role="menu"
    >
      {langOpen ? (
        <>
          <div className="flex items-center gap-2 border-b border-zinc-800 px-2 py-3">
            <button
              type="button"
              onClick={() => setLangOpen(false)}
              className="rounded-full p-2 text-zinc-300 hover:bg-zinc-800"
              aria-label={t('common.back')}
            >
              <IoChevronBack className="text-lg" aria-hidden />
            </button>
            <span className="font-bold text-zinc-100">{t('settings.language')}</span>
          </div>
          <div className="scrollbar-none min-h-0 flex-1 overflow-y-auto py-1">
            {languages.map((lang) => (
              <button
                key={lang.code}
                type="button"
                onClick={() => {
                  changeLanguage(lang.code)
                  closeAll()
                }}
                className="flex w-full items-center justify-between gap-3 px-4 py-3 text-sm text-zinc-200 hover:bg-zinc-800/80"
              >
                <span>{lang.nativeLabel}</span>
                {locale === lang.code ? <IoCheckmark className="text-red-500" aria-hidden /> : null}
              </button>
            ))}
          </div>
        </>
      ) : themeOpen ? (
        <>
          <div className="flex items-center gap-2 border-b border-zinc-800 px-2 py-3">
            <button
              type="button"
              onClick={() => setThemeOpen(false)}
              className="rounded-full p-2 text-zinc-300 hover:bg-zinc-800"
              aria-label={t('common.back')}
            >
              <IoChevronBack className="text-lg" aria-hidden />
            </button>
            <span className="font-bold text-zinc-100">{t('appearance.darkMode')}</span>
          </div>
          <div className="py-1">
            {APPEARANCE_OPTIONS.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => {
                  setPreference(option.value)
                  closeAll()
                }}
                className="flex w-full items-center justify-between gap-3 px-4 py-3 text-sm text-zinc-200 hover:bg-zinc-800/80"
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
        <div className="py-1">
          <MenuRow
            as={Link}
            to={buildProfilePath(token, user)}
            onClick={closeAll}
            role="menuitem"
          >
            <IoPerson className="shrink-0 text-lg text-zinc-300" aria-hidden />
            <span>{t('settings.menu.viewProfile')}</span>
          </MenuRow>
          <MenuRow type="button" role="menuitem">
            <IoCashOutline className="shrink-0 text-lg text-zinc-300" aria-hidden />
            <span>{t('settings.menu.getCoins')}</span>
          </MenuRow>
          <MenuRow type="button" role="menuitem">
            <IoRocketOutline className="shrink-0 text-lg text-zinc-300" aria-hidden />
            <span className="whitespace-nowrap">{t('settings.menu.creatorTools')}</span>
          </MenuRow>
          <MenuRow type="button" role="menuitem" onClick={handleOpenSettings}>
            <IoSettingsOutline className="shrink-0 text-lg text-zinc-300" aria-hidden />
            <span>{t('settings.title')}</span>
          </MenuRow>
          <MenuRow type="button" role="menuitem" onClick={() => setLangOpen(true)}>
            <IoGlobeOutline className="shrink-0 text-lg text-zinc-300" aria-hidden />
            <span>
              {languages.find((lang) => lang.code === locale)?.nativeLabel ?? t('settings.language')}
            </span>
          </MenuRow>
          <MenuRow type="button" role="menuitem" onClick={() => { closeAll(); navigate('/support') }}>
            <IoHelpCircleOutline className="shrink-0 text-lg text-zinc-300" aria-hidden />
            <span>{t('settings.menu.feedbackHelp')}</span>
          </MenuRow>
          <MenuRow type="button" role="menuitem" onClick={() => setThemeOpen(true)}>
            <IoMoonOutline className="shrink-0 text-lg text-zinc-300" aria-hidden />
            <span>{t('settings.menu.darkMode')}</span>
          </MenuRow>
          <div className="mx-4 my-1 border-t border-zinc-800" />
          <MenuRow
            type="button"
            role="menuitem"
            onClick={() => {
              closeAll()
              onLogout?.()
            }}
          >
            <IoLogOutOutline className="shrink-0 text-lg text-zinc-300" aria-hidden />
            <span>{t('settings.logout')}</span>
          </MenuRow>
        </div>
      )}
    </div>
  )
}
