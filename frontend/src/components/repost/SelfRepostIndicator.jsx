import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Link } from 'react-router-dom'
import { LuRepeat2 } from 'react-icons/lu'
import {
  FEED_MORE_PANEL_CARET_CLASS,
  FEED_MORE_PANEL_SURFACE_CLASS,
} from '../../feed/feedLayout.js'

const DEFAULT_AVATAR_URL = '/images/users/default-avatar.jpeg'
const PROFILE_POPOVER_WIDTH_PX = 248
const FLOATING_Z = 200
const HOVER_CLOSE_MS = 120

const THEMES = {
  overlay: {
    row: 'mb-1.5',
    pill: 'inline-flex max-w-full cursor-pointer items-center gap-1.5 rounded-full bg-white/95 px-2 py-1 text-xs font-semibold text-black shadow-sm transition hover:bg-white',
    pillAvatar: 'h-5 w-5 shrink-0 rounded-full object-cover ring-1 ring-black/10',
    iconBtn:
      'flex h-7 w-7 shrink-0 cursor-pointer items-center justify-center rounded-full bg-white/95 text-black shadow-sm transition hover:bg-white disabled:cursor-wait disabled:opacity-60',
    iconSize: 'text-[15px]',
    profileShadow: '[text-shadow:none]',
  },
  sidebar: {
    row: 'mt-2',
    pill: 'inline-flex max-w-full cursor-pointer items-center gap-1.5 rounded-md bg-zinc-800/90 px-2 py-1 text-xs font-semibold text-zinc-100 transition hover:bg-zinc-700/90',
    pillAvatar: 'h-5 w-5 shrink-0 rounded-full object-cover ring-1 ring-zinc-600',
    iconBtn:
      'flex h-7 w-7 shrink-0 cursor-pointer items-center justify-center rounded-full bg-zinc-800/90 text-[#FACE15] ring-1 ring-zinc-600 transition hover:bg-zinc-700/90 disabled:cursor-wait disabled:opacity-60',
    iconSize: 'text-[15px]',
    profileShadow: '',
  },
}

function clampLeft(left, width, margin = 8) {
  const maxLeft = Math.max(margin, window.innerWidth - width - margin)
  return Math.min(Math.max(margin, left), maxLeft)
}

/**
 * TikTok-style: pill avatar + tên + icon đăng lại.
 * Hover pill → popover hồ sơ; hover icon → tooltip "Xóa video đăng lại".
 */
export function SelfRepostIndicator({
  avatarUrl,
  displayName,
  username,
  profilePath,
  onUnrepost,
  busy = false,
  theme = 'overlay',
}) {
  const styles = THEMES[theme] ?? THEMES.overlay
  const pillRef = useRef(null)
  const iconRef = useRef(null)
  const profileCloseTimerRef = useRef(null)
  const tooltipCloseTimerRef = useRef(null)

  const [profileOpen, setProfileOpen] = useState(false)
  const [tooltipOpen, setTooltipOpen] = useState(false)
  const [profilePos, setProfilePos] = useState({ left: 0, top: 0 })
  const [tooltipPos, setTooltipPos] = useState({ left: 0, top: 0 })

  const resolvedAvatar =
    avatarUrl && String(avatarUrl).trim() ? avatarUrl : DEFAULT_AVATAR_URL
  const nameLabel =
    String(displayName ?? '').trim() ||
    String(username ?? '').trim() ||
    'Bạn'

  const profilePopoverHeightPx = theme === 'overlay' ? 52 : 68

  const updateProfilePos = useCallback(() => {
    const el = pillRef.current
    if (!el || typeof window === 'undefined') return
    const rect = el.getBoundingClientRect()
    setProfilePos({
      left: clampLeft(rect.left, PROFILE_POPOVER_WIDTH_PX),
      top: Math.max(8, rect.top - profilePopoverHeightPx - 8),
    })
  }, [profilePopoverHeightPx])

  const updateTooltipPos = useCallback(() => {
    const el = iconRef.current
    if (!el || typeof window === 'undefined') return
    const rect = el.getBoundingClientRect()
    setTooltipPos({
      left: rect.left + rect.width / 2,
      top: rect.top - 8,
    })
  }, [])

  useLayoutEffect(() => {
    if (!profileOpen) return
    updateProfilePos()
  }, [profileOpen, updateProfilePos])

  useLayoutEffect(() => {
    if (!tooltipOpen) return
    updateTooltipPos()
  }, [tooltipOpen, updateTooltipPos])

  useEffect(() => {
    if (!profileOpen && !tooltipOpen) return undefined
    const onReflow = () => {
      if (profileOpen) updateProfilePos()
      if (tooltipOpen) updateTooltipPos()
    }
    window.addEventListener('resize', onReflow)
    window.addEventListener('scroll', onReflow, true)
    return () => {
      window.removeEventListener('resize', onReflow)
      window.removeEventListener('scroll', onReflow, true)
    }
  }, [profileOpen, tooltipOpen, updateProfilePos, updateTooltipPos])

  useEffect(
    () => () => {
      if (profileCloseTimerRef.current) {
        window.clearTimeout(profileCloseTimerRef.current)
      }
      if (tooltipCloseTimerRef.current) {
        window.clearTimeout(tooltipCloseTimerRef.current)
      }
    },
    [],
  )

  const openProfile = useCallback(() => {
    if (profileCloseTimerRef.current) {
      window.clearTimeout(profileCloseTimerRef.current)
      profileCloseTimerRef.current = null
    }
    setProfileOpen(true)
  }, [])

  const scheduleCloseProfile = useCallback(() => {
    profileCloseTimerRef.current = window.setTimeout(() => {
      setProfileOpen(false)
    }, HOVER_CLOSE_MS)
  }, [])

  const openTooltip = useCallback(() => {
    if (tooltipCloseTimerRef.current) {
      window.clearTimeout(tooltipCloseTimerRef.current)
      tooltipCloseTimerRef.current = null
    }
    setTooltipOpen(true)
  }, [])

  const scheduleCloseTooltip = useCallback(() => {
    tooltipCloseTimerRef.current = window.setTimeout(() => {
      setTooltipOpen(false)
    }, HOVER_CLOSE_MS)
  }, [])

  const handleUnrepostClick = useCallback(
    (event) => {
      event.preventDefault()
      event.stopPropagation()
      if (busy) return
      void onUnrepost?.()
    },
    [busy, onUnrepost],
  )

  const profileCardInner = (
    <div className="flex items-center gap-2.5 px-3 py-2.5">
      <img
        src={resolvedAvatar}
        alt=""
        className="h-9 w-9 shrink-0 rounded-full object-cover ring-1 ring-zinc-600"
        referrerPolicy="no-referrer"
        onError={(e) => {
          e.currentTarget.src = DEFAULT_AVATAR_URL
        }}
      />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-white">{nameLabel}</p>
        {theme === 'sidebar' ? (
          <p className="mt-0.5 flex items-center gap-1 text-xs font-semibold text-zinc-300">
            <LuRepeat2 className="shrink-0 text-sm text-[#FACE15]" aria-hidden />
            <span>Bạn đã đăng lại</span>
          </p>
        ) : null}
      </div>
    </div>
  )

  const profilePopover =
    profileOpen && typeof document !== 'undefined'
      ? createPortal(
          <div
            role="tooltip"
            className="fixed"
            style={{
              left: profilePos.left,
              top: profilePos.top,
              width: PROFILE_POPOVER_WIDTH_PX,
              zIndex: FLOATING_Z,
            }}
            onMouseEnter={openProfile}
            onMouseLeave={scheduleCloseProfile}
          >
            <div
              aria-hidden
              className={`pointer-events-none absolute bottom-[-5px] left-4 z-10 h-2.5 w-2.5 rotate-45 rounded-[1px] shadow-sm ${FEED_MORE_PANEL_CARET_CLASS}`}
            />
            <div className={`${FEED_MORE_PANEL_SURFACE_CLASS} overflow-hidden py-0`}>
              {profilePath ? (
                <Link
                  to={profilePath}
                  onClick={(e) => e.stopPropagation()}
                  className={`block transition-colors hover:bg-white/[0.06] ${styles.profileShadow}`}
                >
                  {profileCardInner}
                </Link>
              ) : (
                profileCardInner
              )}
            </div>
          </div>,
          document.body,
        )
      : null

  const unrepostTooltip =
    tooltipOpen && typeof document !== 'undefined'
      ? createPortal(
          <div
            role="tooltip"
            className="pointer-events-none fixed -translate-x-1/2 -translate-y-full whitespace-nowrap rounded-md bg-[#545454] px-2.5 py-1 text-xs font-medium text-white shadow-lg"
            style={{
              left: tooltipPos.left,
              top: tooltipPos.top,
              zIndex: FLOATING_Z,
            }}
          >
            Xóa video đăng lại
            <span
              aria-hidden
              className="absolute left-1/2 top-full -translate-x-1/2 border-[5px] border-transparent border-t-[#545454]"
            />
          </div>,
          document.body,
        )
      : null

  return (
    <>
      <div
        className={`pointer-events-auto flex max-w-full items-center gap-1.5 ${styles.row}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          ref={pillRef}
          className="max-w-full"
          onMouseEnter={openProfile}
          onMouseLeave={scheduleCloseProfile}
          onFocus={openProfile}
          onBlur={scheduleCloseProfile}
        >
          <div
            className={styles.pill}
            aria-label={theme === 'overlay' ? nameLabel : `${nameLabel} đã đăng lại`}
          >
            <img
              src={resolvedAvatar}
              alt=""
              className={styles.pillAvatar}
              referrerPolicy="no-referrer"
              onError={(e) => {
                e.currentTarget.src = DEFAULT_AVATAR_URL
              }}
            />
            <span className="max-w-[9rem] truncate sm:max-w-[11rem]">{nameLabel}</span>
          </div>
        </div>

        <div
          ref={iconRef}
          className="shrink-0"
          onMouseEnter={openTooltip}
          onMouseLeave={scheduleCloseTooltip}
          onFocus={openTooltip}
          onBlur={scheduleCloseTooltip}
        >
          <button
            type="button"
            className={styles.iconBtn}
            aria-label="Xóa video đăng lại"
            disabled={busy}
            onClick={handleUnrepostClick}
          >
            <LuRepeat2 className={styles.iconSize} aria-hidden />
          </button>
        </div>
      </div>
      {profilePopover}
      {unrepostTooltip}
    </>
  )
}
