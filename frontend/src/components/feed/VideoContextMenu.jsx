import React, { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import {
  IoDownloadOutline,
  IoLinkOutline,
  IoShareSocialOutline,
} from 'react-icons/io5'
import {
  LuArrowDownToLine,
  LuGauge,
  LuPictureInPicture2,
} from 'react-icons/lu'
import {
  FEED_MORE_MENU_BADGE_ICON_CLASS,
  FEED_MORE_MENU_INLINE_ICON_CLASS,
  FEED_MORE_MENU_ROW_CLASS,
  FEED_MORE_PANEL_SURFACE_CLASS,
  FEED_MORE_SPEED_PILL_ACTIVE_CLASS,
  FEED_MORE_SPEED_PILL_CLASS,
  FEED_MORE_SPEED_PILL_IDLE_CLASS,
  FEED_MORE_SPEED_TRACK_CLASS,
} from '../../feed/feedLayout.js'
import { FEED_PLAYBACK_SPEEDS } from '../../feed/feedPlaybackSpeedStorage.js'

const MENU_MIN_WIDTH_PX = 300

function formatSpeedPillLabel(rate) {
  return Number(rate) === 1 ? '1.0' : String(rate)
}

/**
 * Menu chuột phải trên video — layout TikTok web.
 *
 * @param {{
 *   open: boolean
 *   x: number
 *   y: number
 *   onClose: () => void
 *   playbackSpeed?: number
 *   onPlaybackSpeedChange?: (rate: number) => void
 *   autoScrollEnabled?: boolean
 *   onAutoScrollChange?: (next: boolean | ((prev: boolean) => boolean)) => void
 *   showAutoScroll?: boolean
 *   onTogglePip?: () => void | Promise<void>
 *   onOpenSubtitles?: () => void
 *   onDownload?: () => void | Promise<void>
 *   onShare?: () => void
 *   onCopyLink?: () => void | Promise<void>
 *   downloading?: boolean
 * }} props
 */
export function VideoContextMenu({
  open,
  x,
  y,
  onClose,
  playbackSpeed = 1,
  onPlaybackSpeedChange,
  autoScrollEnabled = false,
  onAutoScrollChange,
  showAutoScroll = true,
  onTogglePip,
  onOpenSubtitles,
  onDownload,
  onShare,
  onCopyLink,
  downloading = false,
}) {
  const panelRef = useRef(null)
  const [position, setPosition] = useState({ left: x, top: y })

  useLayoutEffect(() => {
    if (!open) return
    const margin = 12
    const panel = panelRef.current
    const panelW = panel?.offsetWidth ?? MENU_MIN_WIDTH_PX
    const panelH = panel?.offsetHeight ?? 320
    const maxLeft = Math.max(margin, window.innerWidth - panelW - margin)
    const maxTop = Math.max(margin, window.innerHeight - panelH - margin)
    setPosition({
      left: Math.min(Math.max(margin, x), maxLeft),
      top: Math.min(Math.max(margin, y), maxTop),
    })
  }, [open, x, y])

  useEffect(() => {
    if (!open) return undefined
    const onKeyDown = (event) => {
      if (event.key === 'Escape') onClose()
    }
    const onPointerDown = (event) => {
      if (panelRef.current?.contains(event.target)) return
      onClose()
    }
    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('pointerdown', onPointerDown, true)
    return () => {
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('pointerdown', onPointerDown, true)
    }
  }, [open, onClose])

  if (!open || typeof document === 'undefined') return null

  return createPortal(
    <div
      ref={panelRef}
      role="menu"
      aria-label="Tùy chọn video"
      className={`fixed z-[200] ${FEED_MORE_PANEL_SURFACE_CLASS}`}
      style={{ left: position.left, top: position.top, minWidth: MENU_MIN_WIDTH_PX }}
      onContextMenu={(event) => event.preventDefault()}
    >
      <div className={FEED_MORE_MENU_ROW_CLASS}>
        <LuGauge
          strokeWidth={1.75}
          className={FEED_MORE_MENU_INLINE_ICON_CLASS}
          aria-hidden
        />
        <span className="shrink-0">Tốc độ</span>
        <div
          className={FEED_MORE_SPEED_TRACK_CLASS}
          role="group"
          aria-label="Tốc độ phát"
        >
          {FEED_PLAYBACK_SPEEDS.map((rate) => {
            const selected = playbackSpeed === rate
            return (
              <button
                key={rate}
                type="button"
                role="menuitemradio"
                aria-checked={selected}
                className={`${FEED_MORE_SPEED_PILL_CLASS} ${
                  selected
                    ? FEED_MORE_SPEED_PILL_ACTIVE_CLASS
                    : FEED_MORE_SPEED_PILL_IDLE_CLASS
                }`}
                onClick={() => onPlaybackSpeedChange?.(rate)}
              >
                {formatSpeedPillLabel(rate)}
              </button>
            )
          })}
        </div>
      </div>

      {showAutoScroll ? (
        <div className={FEED_MORE_MENU_ROW_CLASS}>
          <LuArrowDownToLine
            strokeWidth={1.75}
            className={FEED_MORE_MENU_INLINE_ICON_CLASS}
            aria-hidden
          />
          <span className="min-w-0 flex-1">Cuộn tự động</span>
          <button
            type="button"
            role="switch"
            aria-checked={autoScrollEnabled}
            className={`relative h-[22px] w-[40px] shrink-0 rounded-full transition-colors ${
              autoScrollEnabled ? 'bg-[#fe2c55]' : 'bg-white/25'
            }`}
            onClick={() => onAutoScrollChange?.((prev) => !prev)}
          >
            <span
              className={`absolute top-[2px] left-[2px] h-[18px] w-[18px] rounded-full bg-white shadow transition-transform duration-200 ${
                autoScrollEnabled ? 'translate-x-[18px]' : 'translate-x-0'
              }`}
            />
          </button>
        </div>
      ) : null}

      <button
        type="button"
        role="menuitem"
        className={FEED_MORE_MENU_ROW_CLASS}
        onClick={() => {
          void onTogglePip?.()
          onClose()
        }}
      >
        <LuPictureInPicture2
          strokeWidth={1.75}
          className={FEED_MORE_MENU_INLINE_ICON_CLASS}
          aria-hidden
        />
        <span className="flex-1">Trình phát nổi</span>
      </button>

      <button
        type="button"
        role="menuitem"
        className={FEED_MORE_MENU_ROW_CLASS}
        onClick={() => {
          onClose()
          onOpenSubtitles?.()
        }}
      >
        <span className={FEED_MORE_MENU_BADGE_ICON_CLASS} aria-hidden>
          Aa
        </span>
        <span className="flex-1">Phụ đề</span>
      </button>

      <div className="mx-3 my-1 border-t border-white/10" aria-hidden />

      <button
        type="button"
        role="menuitem"
        className={FEED_MORE_MENU_ROW_CLASS}
        disabled={downloading}
        onClick={() => {
          void onDownload?.()
        }}
      >
        <IoDownloadOutline className={FEED_MORE_MENU_INLINE_ICON_CLASS} aria-hidden />
        <span className="flex-1">
          {downloading ? 'Đang chuẩn bị tải về…' : 'Tải về video'}
        </span>
      </button>

      <button
        type="button"
        role="menuitem"
        className={FEED_MORE_MENU_ROW_CLASS}
        onClick={() => {
          onShare?.()
          onClose()
        }}
      >
        <IoShareSocialOutline className={FEED_MORE_MENU_INLINE_ICON_CLASS} aria-hidden />
        <span className="flex-1">Chia sẻ</span>
      </button>

      <button
        type="button"
        role="menuitem"
        className={FEED_MORE_MENU_ROW_CLASS}
        onClick={() => {
          void onCopyLink?.()
          onClose()
        }}
      >
        <IoLinkOutline className={FEED_MORE_MENU_INLINE_ICON_CLASS} aria-hidden />
        <span className="flex-1">Sao chép liên kết</span>
      </button>
    </div>,
    document.body,
  )
}
