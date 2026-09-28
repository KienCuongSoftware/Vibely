import React, { memo } from 'react'
import { useTranslation } from 'react-i18next'
import { AvatarImage } from '@/shared/components/AvatarImage.jsx'
import { LiveBadge } from '@/features/live/components/LiveBadge.jsx'
import { LiveVerifiedBadge } from '@/features/live/components/LiveVerifiedBadge.jsx'
import { formatLiveViewerCount } from '@/features/live/utils/formatLiveCount.js'

/** @param {{ stream: import('../api/liveContracts.js').LiveSummary, onSelect?: (stream) => void }} props */
export const LiveStreamCard = memo(function LiveStreamCard({ stream, onSelect }) {
  const { t } = useTranslation()
  const hostName = stream.host?.displayName || stream.host?.username

  return (
    <button
      type="button"
      onClick={() => onSelect?.(stream)}
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
    </button>
  )
})
