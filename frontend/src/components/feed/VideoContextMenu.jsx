import React, { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import {
  IoDownloadOutline,
  IoInformationCircleOutline,
  IoLinkOutline,
  IoShareSocialOutline,
} from 'react-icons/io5'
import { LuRepeat2 } from 'react-icons/lu'
import { FEED_MORE_PANEL_SURFACE_CLASS } from '../../feed/feedLayout.js'

const MENU_WIDTH_PX = 220
const MENU_ITEM_CLASS =
  'flex w-full cursor-pointer items-center gap-3 px-4 py-2.5 text-left text-[13px] font-medium text-white transition-colors hover:bg-white/[0.08] disabled:cursor-wait disabled:opacity-60'

/**
 * @param {{
 *   open: boolean
 *   x: number
 *   y: number
 *   onClose: () => void
 *   onDownload?: () => void | Promise<void>
 *   onShare?: () => void
 *   onCopyLink?: () => void | Promise<void>
 *   onRepost?: () => void
 *   reposted?: boolean
 *   repostBusy?: boolean
 *   onViewDetails?: () => void
 *   downloading?: boolean
 * }} props
 */
export function VideoContextMenu({
  open,
  x,
  y,
  onClose,
  onDownload,
  onShare,
  onCopyLink,
  onRepost,
  reposted = false,
  repostBusy = false,
  onViewDetails,
  downloading = false,
}) {
  const panelRef = useRef(null)
  const [position, setPosition] = useState({ left: x, top: y })

  useLayoutEffect(() => {
    if (!open) return
    const margin = 12
    const panel = panelRef.current
    const panelW = panel?.offsetWidth ?? MENU_WIDTH_PX
    const panelH = panel?.offsetHeight ?? 200
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
      className={`fixed z-[200] min-w-[${MENU_WIDTH_PX}px] ${FEED_MORE_PANEL_SURFACE_CLASS}`}
      style={{ left: position.left, top: position.top, minWidth: MENU_WIDTH_PX }}
      onContextMenu={(event) => event.preventDefault()}
    >
      <button
        type="button"
        role="menuitem"
        className={MENU_ITEM_CLASS}
        disabled={downloading}
        onClick={() => {
          void onDownload?.()
        }}
      >
        <IoDownloadOutline className="h-[18px] w-[18px] shrink-0 opacity-90" aria-hidden />
        <span>{downloading ? 'Đang chuẩn bị tải về…' : 'Tải về video'}</span>
      </button>
      <button
        type="button"
        role="menuitem"
        className={MENU_ITEM_CLASS}
        onClick={() => {
          onShare?.()
          onClose()
        }}
      >
        <IoShareSocialOutline className="h-[18px] w-[18px] shrink-0 opacity-90" aria-hidden />
        <span>Chia sẻ</span>
      </button>
      <button
        type="button"
        role="menuitem"
        className={MENU_ITEM_CLASS}
        onClick={() => {
          void onCopyLink?.()
          onClose()
        }}
      >
        <IoLinkOutline className="h-[18px] w-[18px] shrink-0 opacity-90" aria-hidden />
        <span>Sao chép liên kết</span>
      </button>
      {onRepost ? (
        <button
          type="button"
          role="menuitem"
          className={MENU_ITEM_CLASS}
          disabled={repostBusy}
          onClick={() => {
            onRepost()
            onClose()
          }}
        >
          <LuRepeat2 className="h-[18px] w-[18px] shrink-0 opacity-90" aria-hidden />
          <span>{reposted ? 'Xóa video đăng lại' : 'Đăng lại'}</span>
        </button>
      ) : null}
      {onViewDetails ? (
        <button
          type="button"
          role="menuitem"
          className={MENU_ITEM_CLASS}
          onClick={() => {
            onViewDetails?.()
            onClose()
          }}
        >
          <IoInformationCircleOutline className="h-[18px] w-[18px] shrink-0 opacity-90" aria-hidden />
          <span>Xem chi tiết video</span>
        </button>
      ) : null}
    </div>,
    document.body,
  )
}
