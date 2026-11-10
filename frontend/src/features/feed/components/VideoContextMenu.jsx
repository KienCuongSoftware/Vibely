import React, { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useTranslation } from 'react-i18next'
import {
  IoDownloadOutline,
  IoLinkOutline,
  IoShareSocialOutline,
} from 'react-icons/io5'
import { LuPictureInPicture2 } from 'react-icons/lu'
import {
  FeedMoreAutoScrollRow,
  FeedMoreMenuDivider,
  FeedMoreMenuRowButton,
  FeedMoreSpeedRow,
  FeedMoreSubtitlesIcon,
} from '@/features/feed/components/FeedMoreMenuPrimitives.jsx'
import {
  FEED_MORE_MENU_INLINE_ICON_CLASS,
  FEED_MORE_PANEL_SURFACE_CLASS,
} from '@/features/feed/utils/feedLayout.js'

const MENU_MIN_WIDTH_PX = 300

/**
 * Menu chuột phải trên video — layout TikTok web.
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
  const { t } = useTranslation()
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
      aria-label={t('feedMenu.menuAria')}
      className={`fixed z-[200] ${FEED_MORE_PANEL_SURFACE_CLASS}`}
      style={{ left: position.left, top: position.top, minWidth: MENU_MIN_WIDTH_PX }}
      onContextMenu={(event) => event.preventDefault()}
    >
      <FeedMoreSpeedRow
        playbackSpeed={playbackSpeed}
        onPlaybackSpeedChange={onPlaybackSpeedChange}
        radio
      />

      {showAutoScroll ? (
        <FeedMoreAutoScrollRow
          autoScrollEnabled={autoScrollEnabled}
          onAutoScrollChange={onAutoScrollChange}
        />
      ) : null}

      <FeedMoreMenuRowButton
        icon={
          <LuPictureInPicture2
            strokeWidth={1.75}
            className={FEED_MORE_MENU_INLINE_ICON_CLASS}
            aria-hidden
          />
        }
        label={t('feedMenu.pip')}
        onClick={() => {
          void onTogglePip?.()
          onClose()
        }}
      />

      <FeedMoreMenuRowButton
        icon={<FeedMoreSubtitlesIcon />}
        label={t('feedMenu.subtitles')}
        onClick={() => {
          onClose()
          onOpenSubtitles?.()
        }}
      />

      <FeedMoreMenuDivider />

      <FeedMoreMenuRowButton
        icon={
          <IoDownloadOutline
            className={FEED_MORE_MENU_INLINE_ICON_CLASS}
            aria-hidden
          />
        }
        label={
          downloading ? t('feedMenu.preparingDownload') : t('feedMenu.download')
        }
        disabled={downloading}
        onClick={() => {
          void onDownload?.()
        }}
      />

      <FeedMoreMenuRowButton
        icon={
          <IoShareSocialOutline
            className={FEED_MORE_MENU_INLINE_ICON_CLASS}
            aria-hidden
          />
        }
        label={t('feedMenu.share')}
        onClick={() => {
          onShare?.()
          onClose()
        }}
      />

      <FeedMoreMenuRowButton
        icon={
          <IoLinkOutline
            className={FEED_MORE_MENU_INLINE_ICON_CLASS}
            aria-hidden
          />
        }
        label={t('feedMenu.copyLink')}
        onClick={() => {
          void onCopyLink?.()
          onClose()
        }}
      />
    </div>,
    document.body,
  )
}
