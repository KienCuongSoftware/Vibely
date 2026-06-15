import React, { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { IoLogOutOutline, IoPerson } from 'react-icons/io5'
import { Sidebar } from '../Sidebar'
import { AccountActionsPill } from '../AccountActionsPill'
import { TooltipHoverWrap } from '../TooltipControls'
import { handleSidebarMenuSelect } from '../../utils/sidebarNavigation.js'
import { buildProfilePath } from '../../utils/buildProfilePath.js'
import { buildMainSidebarMenuItems } from '../../utils/mainSidebarMenuItems.js'
import { FEED_STAGE_OUTER_WIDTH_CLASS } from './FeedPhoneStage'

const DEFAULT_USER_AVATAR_URL = '/images/users/default-avatar.jpeg'

export function GridLoginPrompt({ title, description }) {
  return (
    <div
      className={`relative mx-auto flex ${FEED_STAGE_OUTER_WIDTH_CLASS} flex-col items-center justify-center overflow-hidden rounded-xl border border-white/10 bg-zinc-950 px-6 py-16 text-center shadow-[0_0_48px_rgba(0,0,0,0.72)] sm:rounded-2xl`}
    >
      <p className="text-lg font-semibold text-zinc-100">{title}</p>
      <p className="mt-2 max-w-xs text-sm leading-relaxed text-zinc-400">
        {description}
      </p>
      <Link
        to="/login"
        className="mt-6 inline-flex items-center justify-center rounded-full bg-red-600 px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-red-500"
      >
        Đăng nhập
      </Link>
    </div>
  )
}

export function GridLoadingState() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center py-16">
      <div
        className="h-10 w-10 animate-spin rounded-full border-2 border-zinc-700 border-t-rose-500"
        aria-hidden
      />
      <p className="mt-4 text-sm text-zinc-500">Đang tải…</p>
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
  const navigate = useNavigate()
  const accountMenuRef = useRef(null)
  const [showAccountMenu, setShowAccountMenu] = useState(false)
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false)

  const menuItems = useMemo(() => buildMainSidebarMenuItems(token), [token])
  const profilePath = useMemo(
    () => buildProfilePath(token, user),
    [token, user],
  )

  const handleSidebarSelect = (id) => {
    handleSidebarMenuSelect(navigate, id, {
      token,
      profilePath,
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
            <Link
              to="/login"
              className="ml-0.5 cursor-pointer rounded-full bg-red-600 px-3 py-1 text-xs font-semibold leading-none text-white hover:bg-red-500"
            >
              Đăng nhập
            </Link>
          ) : (
            <div className="relative" ref={accountMenuRef}>
              <TooltipHoverWrap
                tip="Tài khoản"
                tipHidden={showAccountMenu}
                hoverOnly
              >
                <button
                  type="button"
                  className="flex cursor-pointer rounded-full p-0.5 ring-1 ring-zinc-700 transition hover:ring-zinc-500"
                  aria-label="Menu tài khoản"
                  onClick={() => setShowAccountMenu((prev) => !prev)}
                >
                  <img
                    className="h-7 w-7 rounded-full object-cover"
                    src={
                      user?.avatarUrl && user.avatarUrl.trim()
                        ? user.avatarUrl
                        : DEFAULT_USER_AVATAR_URL
                    }
                    alt="avatar người dùng"
                    referrerPolicy="no-referrer"
                    onError={(e) => {
                      e.currentTarget.src = DEFAULT_USER_AVATAR_URL
                    }}
                  />
                </button>
              </TooltipHoverWrap>
              {showAccountMenu ? (
                <div className="absolute right-0 z-[110] mt-2 w-44 overflow-hidden rounded-xl border border-zinc-700 bg-zinc-800 py-1 shadow-2xl">
                  <Link
                    to={profilePath}
                    className="flex items-center gap-2 px-3 py-2 text-sm text-zinc-100 hover:bg-zinc-700"
                    onClick={() => setShowAccountMenu(false)}
                  >
                    <IoPerson className="text-base" />
                    Xem hồ sơ
                  </Link>
                  <button
                    type="button"
                    className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-zinc-100 hover:bg-zinc-700"
                    onClick={() => {
                      setShowAccountMenu(false)
                      setShowLogoutConfirm(true)
                    }}
                  >
                    <IoLogOutOutline className="text-base" />
                    Đăng xuất
                  </button>
                </div>
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
              Bạn có chắc chắn muốn đăng xuất?
            </p>
            <div className="mt-5 grid grid-cols-2 gap-3 text-base">
              <button
                type="button"
                className="rounded-md bg-zinc-700 py-2 font-semibold text-zinc-200 hover:bg-zinc-600"
                onClick={() => setShowLogoutConfirm(false)}
              >
                Hủy
              </button>
              <button
                type="button"
                className="rounded-md border border-red-500 py-2 font-semibold text-red-400 hover:bg-red-500/10"
                onClick={() => {
                  setShowLogoutConfirm(false)
                  onLogout?.()
                }}
              >
                Đăng xuất
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  )
}
