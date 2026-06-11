import React from 'react'
import { IoTvOutline } from 'react-icons/io5'
import { formatSystemNotificationTime } from './activitySystemUtils.js'

export function ActivitySystemNotificationCard({ item }) {
  const timeLabel = formatSystemNotificationTime(item.createdAt)

  return (
    <article className="rounded-xl bg-zinc-900/95 px-3 py-3 transition hover:bg-zinc-900">
      <p className="text-[13px] leading-snug text-zinc-400">
        {item.badge === 'LIVE' ? (
          <span className="mr-1 inline-flex items-center gap-0.5 align-middle text-zinc-500">
            <IoTvOutline className="text-xs" aria-hidden />
            <span className="text-[11px] font-semibold tracking-wide">LIVE</span>
          </span>
        ) : null}
        <span className="font-semibold text-white">{item.title}</span>
        {item.body ? (
          <>
            {' '}
            <span className="text-zinc-500">{item.body}</span>
          </>
        ) : null}
        {timeLabel ? (
          <>
            {' '}
            <span className="text-zinc-600">{timeLabel}</span>
          </>
        ) : null}
      </p>
    </article>
  )
}
