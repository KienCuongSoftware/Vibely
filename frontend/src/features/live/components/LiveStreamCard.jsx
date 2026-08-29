import React from 'react'
import { LiveBadge } from '@/features/live/components/LiveBadge.jsx'
import { formatLiveViewerCount } from '@/features/live/utils/formatLiveCount.js'

export function LiveStreamCard({ stream, onSelect }) {
  const avatarUrl =
    stream.avatarUrl ?? `https://picsum.photos/seed/vibely-live-avatar-${stream.id}/64/64`

  return (
    <button
      type="button"
      onClick={() => onSelect?.(stream)}
      className="live-stream-card group w-full cursor-pointer text-left"
    >
      <div className="relative aspect-video overflow-hidden rounded-lg bg-zinc-900">
        <img
          src={stream.coverUrl}
          alt=""
          loading="lazy"
          className="h-full w-full object-cover transition duration-300 group-hover:brightness-110"
          referrerPolicy="no-referrer"
        />
        <div className="pointer-events-none absolute left-2 top-2 flex items-center gap-1.5">
          <LiveBadge compact />
          <span className="text-[11px] font-semibold tabular-nums text-white drop-shadow-md">
            {formatLiveViewerCount(stream.viewerCount)}
          </span>
        </div>
      </div>

      <div className="mt-2 flex min-w-0 items-start gap-2">
        <img
          src={avatarUrl}
          alt=""
          className="h-9 w-9 shrink-0 rounded-full object-cover ring-1 ring-zinc-700"
          loading="lazy"
          referrerPolicy="no-referrer"
        />
        <div className="min-w-0 flex-1">
          <p className="line-clamp-2 text-[13px] font-semibold leading-snug text-zinc-100 group-hover:text-white">
            {stream.title}
          </p>
          <p className="mt-0.5 truncate text-[12px] text-zinc-500">{stream.username}</p>
        </div>
      </div>
    </button>
  )
}
