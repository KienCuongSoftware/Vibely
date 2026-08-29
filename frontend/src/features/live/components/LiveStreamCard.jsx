import React from 'react'
import { LiveBadge } from '@/features/live/components/LiveBadge.jsx'
import { formatLiveViewerCount } from '@/features/live/utils/formatLiveCount.js'

export function LiveStreamCard({ stream, onSelect }) {
  return (
    <button
      type="button"
      onClick={() => onSelect?.(stream)}
      className="group w-[148px] shrink-0 cursor-pointer text-left sm:w-[168px] lg:w-[180px]"
    >
      <div className="relative aspect-[9/16] overflow-hidden rounded-xl bg-zinc-900">
        <img
          src={stream.coverUrl}
          alt=""
          loading="lazy"
          className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.03]"
          referrerPolicy="no-referrer"
        />
        <div className="pointer-events-none absolute inset-x-0 top-0 flex items-start justify-between p-2">
          <LiveBadge compact />
          <span className="rounded-md bg-black/55 px-1.5 py-0.5 text-[11px] font-semibold tabular-nums text-white backdrop-blur-sm">
            {formatLiveViewerCount(stream.viewerCount)}
          </span>
        </div>
        <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-linear-to-t from-black/90 via-black/40 to-transparent px-2.5 pb-2.5 pt-10">
          <p className="line-clamp-2 text-[12px] font-semibold leading-snug text-white">
            {stream.title}
          </p>
          <p className="mt-1 truncate text-[11px] text-zinc-300">@{stream.username}</p>
        </div>
      </div>
    </button>
  )
}
