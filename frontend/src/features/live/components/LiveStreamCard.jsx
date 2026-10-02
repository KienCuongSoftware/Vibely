import React, { memo, useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { AvatarImage } from '@/shared/components/AvatarImage.jsx'
import { LiveBadge } from '@/features/live/components/LiveBadge.jsx'
import { LiveVerifiedBadge } from '@/features/live/components/LiveVerifiedBadge.jsx'
import { LivePlayer } from '@/features/live/components/player/LivePlayer.jsx'
import { LIVE_DISCOVERY } from '@/features/live/constants/liveConstants.js'
import { formatLiveViewerCount } from '@/features/live/utils/formatLiveCount.js'

/** @param {{ stream: import('../api/liveContracts.js').LiveSummary, onSelect?: (stream) => void }} props */
export const LiveStreamCard = memo(function LiveStreamCard({ stream, onSelect }) {
  const { t } = useTranslation()
  const hostName = stream.host?.displayName || stream.host?.username
  const [previewing, setPreviewing] = useState(false)
  const hoverTimerRef = useRef(0)

  useEffect(() => () => clearTimeout(hoverTimerRef.current), [])

  const startPreview = () => {
    clearTimeout(hoverTimerRef.current)
    hoverTimerRef.current = setTimeout(() => setPreviewing(true), LIVE_DISCOVERY.HOVER_PREVIEW_DELAY_MS)
  }

  const stopPreview = () => {
    clearTimeout(hoverTimerRef.current)
    setPreviewing(false)
  }

  const select = () => onSelect?.(stream)

  // A div, not a <button>: the live preview player renders its own buttons.
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={select}
      onKeyDown={(event) => {
        if (event.key !== 'Enter' && event.key !== ' ') return
        event.preventDefault()
        select()
      }}
      onMouseEnter={startPreview}
      onMouseLeave={stopPreview}
      aria-label={t('livePage.card.watchAria', { title: stream.title, host: hostName })}
      className="live-stream-card group w-full cursor-pointer text-left"
    >
      <div className="relative aspect-video overflow-hidden rounded-lg bg-zinc-900">
        {stream.coverUrl ? (
          <img
            src={stream.coverUrl}
            alt=""
            loading="lazy"
            className="h-full w-full object-cover transition duration-300 group-hover:brightness-110"
            referrerPolicy="no-referrer"
          />
        ) : (
          <div className="vibely-keep-dark absolute inset-0 flex items-center justify-center bg-zinc-900">
            <AvatarImage
              src={stream.host?.avatarUrl}
              className="absolute inset-0 h-full w-full scale-110 object-cover blur-xl brightness-50"
              loading="lazy"
            />
            <AvatarImage
              src={stream.host?.avatarUrl}
              className="relative h-14 w-14 rounded-full object-cover ring-2 ring-[#fe2c55]"
              loading="lazy"
            />
          </div>
        )}
        {previewing ? (
          <LivePlayer live={stream} muted className="pointer-events-none absolute inset-0" />
        ) : null}
        <div className="pointer-events-none absolute left-2 top-2 flex items-center gap-1.5">
          <LiveBadge compact />
          <span className="text-[11px] font-semibold tabular-nums text-white drop-shadow-md">
            {formatLiveViewerCount(stream.viewerCount)}
          </span>
        </div>
      </div>

      <div className="mt-2 flex min-w-0 items-start gap-2">
        <AvatarImage
          src={stream.host?.avatarUrl}
          className="h-9 w-9 shrink-0 rounded-full object-cover ring-1 ring-zinc-700"
          loading="lazy"
        />
        <div className="min-w-0 flex-1">
          <p className="line-clamp-2 text-[13px] font-semibold leading-snug text-zinc-100 group-hover:text-white">
            {stream.title}
          </p>
          <p className="mt-0.5 flex min-w-0 items-center gap-0.5 text-[12px] text-zinc-500">
            <span className="truncate">{hostName}</span>
            {stream.host?.verified ? <LiveVerifiedBadge className="text-xs" /> : null}
          </p>
        </div>
      </div>
    </div>
  )
})
