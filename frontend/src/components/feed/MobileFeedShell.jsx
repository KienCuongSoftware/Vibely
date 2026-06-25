import React, { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  IoClose,
  IoCompass,
  IoHome,
  IoMenu,
  IoPaperPlane,
  IoPeople,
  IoPerson,
  IoSearch,
} from 'react-icons/io5'
import { apiClient } from '../../api/client.js'
import { useChatInboxBadge } from '../../state/ChatInboxBadgeContext.jsx'
import { formatNotificationBadgeCount } from '../../utils/notificationBadge.js'
import { DEFAULT_AVATAR_URL } from '../AvatarImage.jsx'
import { buildProfilePath } from '../../utils/buildProfilePath.js'
import { handleSidebarMenuSelect } from '../../utils/sidebarNavigation.js'
import { markFollowingPreferFeedFromSidebar } from '../../utils/followingPageView.js'

export const MOBILE_FEED_TOP_BAR_PX = 48
export const MOBILE_FEED_BOTTOM_NAV_PX = 56
/** Mobile comment sheet — overlay ~58% đáy vùng feed; video full phía sau (TikTok). */
export const MOBILE_COMMENTS_SHEET_RATIO = 0.58

export function computeMobileFeedCommentsLayout(options = {}) {
  const includeBottomNav = options.includeBottomNav !== false
  if (typeof window === 'undefined') {
    const contentH = 667 - MOBILE_FEED_TOP_BAR_PX - (includeBottomNav ? MOBILE_FEED_BOTTOM_NAV_PX : 0)
    const sheetH = Math.round(contentH * MOBILE_COMMENTS_SHEET_RATIO)
    return { contentH, sheetH, peekH: contentH - sheetH }
  }
  const viewportH = window.visualViewport?.height ?? window.innerHeight
  const contentH = Math.max(
    320,
    Math.round(
      viewportH -
        MOBILE_FEED_TOP_BAR_PX -
        (includeBottomNav ? MOBILE_FEED_BOTTOM_NAV_PX : 0),
    ),
  )
  const sheetH = Math.round(contentH * MOBILE_COMMENTS_SHEET_RATIO)
  return { contentH, sheetH, peekH: contentH - sheetH }
}

export function isMobileFeedLayout() {
  if (typeof window === 'undefined') return false
  return window.matchMedia('(max-width: 1023px)').matches
}

export function MobileFeedTopBar({
  onLiveTap,
  showBack = false,
  onBack,
  feedTabs = false,
  activeFeedTab = 'for-you',
  onFeedTabChange,
  onSearchTap,
}) {
  const feedTabClass = (tab) =>
    `cursor-pointer pb-0.5 ${
      activeFeedTab === tab
        ? 'border-b-2 border-white text-white'
        : 'text-white/55'
    }`

  return (
    <header className="relative z-40 h-12 shrink-0 bg-black text-white">
      <div className="absolute left-2 top-1/2 z-10 -translate-y-1/2">
        {showBack ? (
          <button
            type="button"
            className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-full text-2xl text-white"
            aria-label="Quay lại"
            onClick={onBack}
          >
            <IoClose aria-hidden />
          </button>
        ) : (
          <button
            type="button"
            className="flex h-9 w-11 cursor-pointer items-center justify-center"
            aria-label="Live"
            onClick={onLiveTap}
          >
            <span className="flex h-5 w-7 items-center justify-center rounded border-[1.5px] border-white text-[8px] font-extrabold leading-none tracking-wide">
              LIVE
            </span>
          </button>
        )}
      </div>

      <div className="absolute right-2 top-1/2 z-10 -translate-y-1/2">
        {onSearchTap ? (
          <button
            type="button"
            className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-full text-xl text-white"
            aria-label="Tìm kiếm"
            onClick={onSearchTap}
          >
            <IoSearch aria-hidden />
          </button>
        ) : (
          <Link
            to="/search"
            className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-full text-xl text-white"
            aria-label="Tìm kiếm"
          >
            <IoSearch aria-hidden />
          </Link>
        )}
      </div>

      {feedTabs ? (
        <div className="flex h-12 items-center justify-center gap-4 px-14 text-[15px] font-semibold">
          <button
            type="button"
            className={feedTabClass('friends')}
            onClick={() => onFeedTabChange?.('friends')}
          >
            Bạn bè
          </button>
          <button
            type="button"
            className={feedTabClass('following')}
            onClick={() => onFeedTabChange?.('following')}
          >
            Đã follow
          </button>
          <button
            type="button"
            className={feedTabClass('for-you')}
            onClick={() => onFeedTabChange?.('for-you')}
          >
            Đề xuất
          </button>
        </div>
      ) : (
        <div className="flex h-12 items-center justify-center px-14">
          <Link to="/foryou" className="text-lg font-bold tracking-tight text-white">
            Vibely
          </Link>
        </div>
      )}
    </header>
  )
}

export function MobileFeedBottomNav({ token, user, onSelectMenu, activeId = 'latest' }) {
  const navigate = useNavigate()
  const profilePath = buildProfilePath(token, user)
  const { chatInboxBadgeCount } = useChatInboxBadge()
  const messagesBadgeLabel = formatNotificationBadgeCount(chatInboxBadgeCount)

  const go = (id) => {
    if (onSelectMenu) {
      onSelectMenu(id)
      return
    }
    handleSidebarMenuSelect(navigate, id, {
      token,
      profilePath,
    })
  }

  const itemClass = (id) =>
    `flex flex-1 cursor-pointer flex-col items-center justify-center gap-0.5 ${
      activeId === id ? 'text-white' : 'text-zinc-400'
    }`

  return (
    <nav
      className="relative z-40 flex h-14 shrink-0 items-stretch border-t border-white/10 bg-black px-1 text-[10px] text-zinc-300"
      aria-label="Điều hướng chính"
    >
      <button
        type="button"
        className={itemClass('latest')}
        onClick={() => go('latest')}
      >
        <IoHome className="text-[22px]" aria-hidden />
        <span>Trang chủ</span>
      </button>
      <button
        type="button"
        className={itemClass('explore')}
        onClick={() => (token ? go('explore') : navigate('/login'))}
      >
        <IoCompass className="text-[22px]" aria-hidden />
        <span>Khám phá</span>
      </button>
      <button
        type="button"
        className="flex flex-1 cursor-pointer flex-col items-center justify-center gap-0.5"
        onClick={() => (token ? go('upload') : navigate('/login'))}
        aria-label="Tải lên"
      >
        <span className="relative flex h-9 w-10 items-center justify-center">
          <span
            className="pointer-events-none absolute inset-0 rounded-md border-l-[3px] border-r-[3px] border-cyan-400 border-r-fuchsia-500"
            aria-hidden
          />
          <span className="flex h-7 w-[1.65rem] items-center justify-center rounded-md bg-white text-lg font-bold leading-none text-black">
            +
          </span>
        </span>
      </button>
      <button
        type="button"
        className={itemClass('messages')}
        onClick={() => (token ? go('messages') : navigate('/login'))}
      >
        <span className="relative inline-flex">
          <IoPaperPlane className="text-[22px]" aria-hidden />
          {token && chatInboxBadgeCount > 0 ? (
            <span
              className="absolute -right-2 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-[#FE2C55] px-0.5 text-[9px] font-bold leading-none text-white"
              aria-hidden
            >
              {messagesBadgeLabel}
            </span>
          ) : null}
        </span>
        <span>Hộp thư</span>
      </button>
      <button
        type="button"
        className={itemClass('profile')}
        onClick={() => (token ? go('profile') : navigate('/login'))}
      >
        <IoPerson className="text-[22px]" aria-hidden />
        <span>Hồ sơ</span>
      </button>
    </nav>
  )
}

function profileHrefFor(username) {
  const raw = String(username ?? '')
    .trim()
    .replace(/^@/, '')
  return raw ? `/@${encodeURIComponent(raw)}` : '/foryou'
}

export function MobileFeedMenuDrawer({
  open,
  onClose,
  token,
  user,
  activeFeedTab = 'for-you',
}) {
  const navigate = useNavigate()
  const [following, setFollowing] = useState([])
  const [followingLoading, setFollowingLoading] = useState(false)

  useEffect(() => {
    if (!open) return undefined
    if (!token || !user?.username) {
      setFollowing([])
      setFollowingLoading(false)
      return undefined
    }
    let cancelled = false
    setFollowingLoading(true)
    apiClient
      .getProfileFollowing(user.username, { token, page: 0, size: 50 })
      .then((res) => {
        if (cancelled) return
        setFollowing(Array.isArray(res?.items) ? res.items : [])
      })
      .catch(() => {
        if (!cancelled) setFollowing([])
      })
      .finally(() => {
        if (!cancelled) setFollowingLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [open, token, user?.username])

  if (!open) return null

  const goForYou = () => {
    navigate('/foryou')
    onClose()
  }

  const goFollowing = () => {
    markFollowingPreferFeedFromSidebar()
    navigate('/following')
    onClose()
  }

  const goProfile = (username) => {
    navigate(profileHrefFor(username))
    onClose()
  }

  return (
    <>
      <button
        type="button"
        className="fixed inset-0 z-200 bg-black/45"
        aria-label="Đóng menu"
        onClick={onClose}
      />
      <aside className="fixed inset-y-0 left-0 z-210 flex w-[min(320px,78vw)] flex-col overflow-y-auto bg-zinc-950 py-3 text-zinc-100 shadow-2xl">
        <div className="flex items-center gap-3 px-3 pb-4">
          <button
            type="button"
            className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-full text-[22px] text-white"
            aria-label="Đóng menu"
            onClick={onClose}
          >
            <IoMenu aria-hidden />
          </button>
          <Link
            to="/foryou"
            className="text-xl font-bold tracking-tight text-white"
            onClick={onClose}
          >
            Vibely
          </Link>
        </div>

        <nav className="space-y-0.5 px-2">
          <button
            type="button"
            className={`flex w-full cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5 text-left text-[15px] font-semibold ${
              activeFeedTab === 'for-you'
                ? 'text-[#fe2c55]'
                : 'text-zinc-100 hover:bg-white/5'
            }`}
            onClick={goForYou}
          >
            <IoHome
              className={`text-[22px] ${activeFeedTab === 'for-you' ? 'text-[#fe2c55]' : 'text-zinc-100'}`}
              aria-hidden
            />
            Đề xuất
          </button>
          <button
            type="button"
            className={`flex w-full cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5 text-left text-[15px] font-semibold ${
              activeFeedTab === 'following'
                ? 'text-[#fe2c55]'
                : 'text-zinc-100 hover:bg-white/5'
            }`}
            onClick={goFollowing}
          >
            <IoPeople
              className={`text-[22px] ${activeFeedTab === 'following' ? 'text-[#fe2c55]' : 'text-zinc-100'}`}
              aria-hidden
            />
            Đã follow
          </button>
        </nav>

        <div className="my-3 h-px bg-zinc-800" />

        <div className="px-4 pb-2">
          <h2 className="text-[15px] font-bold text-white">Các tài khoản Đã follow</h2>
        </div>

        <div className="min-h-0 flex-1 px-2 pb-6">
          {!token ? (
            <p className="px-3 py-4 text-[14px] leading-relaxed text-zinc-500">
              Đăng nhập để xem các tài khoản bạn follow.
            </p>
          ) : followingLoading ? (
            <p className="px-3 py-4 text-[14px] text-zinc-500">Đang tải…</p>
          ) : following.length === 0 ? (
            <p className="px-3 py-4 text-[14px] leading-relaxed text-zinc-500">
              Những tài khoản bạn follow sẽ xuất hiện tại đây
            </p>
          ) : (
            <ul className="space-y-0.5">
              {following.map((row) => {
                const username = String(row?.username ?? '').trim()
                const avatar = String(row?.avatarUrl ?? '').trim() || DEFAULT_AVATAR_URL
                return (
                  <li key={row?.id ?? username}>
                    <button
                      type="button"
                      className="flex w-full cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5 text-left transition hover:bg-white/5"
                      onClick={() => goProfile(username)}
                    >
                      <img
                        src={avatar}
                        alt=""
                        className="h-10 w-10 shrink-0 rounded-full object-cover ring-1 ring-zinc-700"
                        referrerPolicy="no-referrer"
                        onError={(e) => {
                          e.currentTarget.src = DEFAULT_AVATAR_URL
                        }}
                      />
                      <span className="min-w-0 truncate text-[15px] font-semibold text-white">
                        {username}
                      </span>
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      </aside>
    </>
  )
}
