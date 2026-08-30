import React, { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Sidebar } from '@/shared/components/Sidebar'
import { AccountActionsPill } from '@/features/profile/components/AccountActionsPill'
import { AccountAvatarMenu } from '@/shared/components/AccountAvatarMenu.jsx'
import { GuestLoginTrigger } from '@/features/auth/store/GuestAuthUiContext.jsx'
import { TooltipHoverWrap } from '@/shared/components/TooltipControls'
import { handleSidebarMenuSelect } from '@/shared/utils/sidebarNavigation.js'
import { buildProfilePath } from '@/features/profile/utils/buildProfilePath.js'
import { buildMainSidebarMenuItems } from '@/shared/utils/mainSidebarMenuItems.js'
import { FEED_STAGE_OUTER_WIDTH_CLASS } from '@/features/feed/components/FeedPhoneStage'

const DEFAULT_USER_AVATAR_URL = '/images/users/default-avatar.jpeg'

export function GridLoginPrompt({ title, description }) {
  const { t } = useTranslation()
  return (
    <div
      className={`relative mx-auto flex ${FEED_STAGE_OUTER_WIDTH_CLASS} flex-col items-center justify-center overflow-hidden rounded-xl border border-white/10 bg-zinc-950 px-6 py-16 text-center sm:rounded-2xl`}
    >
      <p className="text-lg font-semibold text-zinc-100">{title}</p>
      <p className="mt-2 max-w-xs text-sm leading-relaxed text-zinc-400">
        {description}
      </p>
      <GuestLoginTrigger
        className="mt-6 inline-flex items-center justify-center rounded-full bg-red-600 px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-red-500"
      >
        {t('nav.login')}
      </GuestLoginTrigger>
    </div>
  )
}

export function GridLoadingState() {
  const { t } = useTranslation()
  return (
    <div className="flex flex-1 flex-col items-center justify-center py-16">
      <div
        className="h-10 w-10 animate-spin rounded-full border-2 border-zinc-700 border-t-rose-500"
        aria-hidden
      />
      <p className="mt-4 text-sm text-zinc-500">{t('feed.loadingEllipsis')}</p>
    </div>
  )
}

export function CreatorGridShell({
  activeMenu,
  token,
  user,
  onLogout,
  sidebarCollapsed = false,
  contentFullBleed = false,
  children,
}) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const accountMenuRef = useRef(null)
  const [showAccountMenu, setShowAccountMenu] = useState(false)
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false)

  const menuItems = useMemo(() => buildMainSidebarMenuItems(token), [token])

  const handleSidebarSelect = (id) => {
    handleSidebarMenuSelect(navigate, id, {
      token,
      profilePath: buildProfilePath(token, user),
      onUnhandled: () => {},
    })
  }

  useEffect(() => {
    if (!showAccountMenu) return undefined

    const handleOutsideClick = (event) => {
      if (!accountMenuRef.current?.contains(event.target)) {
        setShowAccountMenu(false)
      }
    }
    const handleEscape = (event) => {
      if (event.key === 'Escape') {
        setShowAccountMenu(false)
        setShowLogoutConfirm(false)
      }
    }

    document.addEventListener('mousedown', handleOutsideClick)
    document.addEventListener('keydown', handleEscape)
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [showAccountMenu])

  useEffect(() => {
    if (!showLogoutConfirm) return undefined
    const handleEscape = (event) => {
      if (event.key === 'Escape') setShowLogoutConfirm(false)
    }
    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [showLogoutConfirm])

  return (
    <section className="flex h-dvh max-h-dvh min-h-0 w-full flex-col overflow-hidden bg-black text-zinc-100 lg:flex-row">
      <div className="hidden shrink-0 lg:block">
        <Sidebar
          menuItems={menuItems}
          activeMenu={activeMenu}
          onSelectMenu={handleSidebarSelect}
          token={token}
          user={user}
          onLogout={token ? onLogout : undefined}
          forceCollapsed={sidebarCollapsed}
        />
      </div>

      <div className={`relative flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden ${
        contentFullBleed
          ? 'px-0 pt-0'
          : 'px-3 pt-1 sm:px-10 sm:pt-2 lg:px-16 xl:px-24'
      }`}>
        <AccountActionsPill
          className="absolute right-8 top-5 z-[100]"
          tone="profile"
        >
          {!token ? (
              <GuestLoginTrigger className="ml-0.5 cursor-pointer rounded-full bg-red-600 px-3.5 py-2 text-xs font-semibold leading-none text-white hover:bg-red-500">
                {t('nav.login')}
              </GuestLoginTrigger>
          ) : (
            <div className="relative" ref={accountMenuRef}>
              <TooltipHoverWrap
                tip={t('common.account')}
                tipHidden={showAccountMenu}
                hoverOnly
              >
                <button
                  type="button"
                  className="flex cursor-pointer rounded-full p-0.5 transition hover:bg-zinc-800"
                  aria-label={t('common.accountMenu')}
                  onClick={() => setShowAccountMenu((prev) => !prev)}
                >
                  <img
                    className="h-7 w-7 rounded-full object-cover"
                    src={
                      user?.avatarUrl && user.avatarUrl.trim()
                        ? user.avatarUrl
                        : DEFAULT_USER_AVATAR_URL
                    }
                    alt={t('common.userAvatar')}
                    referrerPolicy="no-referrer"
                    onError={(e) => {
                      e.currentTarget.src = DEFAULT_USER_AVATAR_URL
                    }}
                  />
                </button>
              </TooltipHoverWrap>
              {showAccountMenu ? (
                <AccountAvatarMenu
                  open
                  onClose={() => setShowAccountMenu(false)}
                  user={user}
                  token={token}
                  className="absolute right-0 z-[110] top-full mt-2"
                  onLogout={() => {
                    setShowAccountMenu(false)
                    setShowLogoutConfirm(true)
                  }}
                />
              ) : null}
            </div>
          )}
        </AccountActionsPill>

        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
          {children}
        </div>
      </div>

      {showLogoutConfirm ? (
        <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/55 px-4">
          <div className="w-full max-w-sm rounded-xl bg-zinc-800 p-6 text-center shadow-2xl">
            <p className="text-2xl font-bold leading-snug">
              {t('common.logoutConfirm')}
            </p>
            <div className="mt-5 grid grid-cols-2 gap-3 text-base">
              <button
                type="button"
                className="rounded-md bg-zinc-700 py-2 font-semibold text-zinc-200 hover:bg-zinc-600"
                onClick={() => setShowLogoutConfirm(false)}
              >
                {t('common.cancel')}
              </button>
              <button
                type="button"
                className="rounded-md border border-red-500 py-2 font-semibold text-red-400 hover:bg-red-500/10"
                onClick={() => {
                  setShowLogoutConfirm(false)
                  onLogout?.()
                }}
              >
                {t('common.logout')}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  )
}
