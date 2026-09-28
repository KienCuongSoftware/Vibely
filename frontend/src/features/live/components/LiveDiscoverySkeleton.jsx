import React from 'react'
import { LIVE_DISCOVERY } from '@/features/live/constants/liveConstants.js'

const SKELETON_ROWS = 2

export function LiveDiscoverySkeleton() {
  return (
    <div className="animate-pulse" aria-hidden>
      <div className="live-skeleton mx-auto aspect-video w-full max-w-[960px] rounded-2xl bg-zinc-900" />
      {Array.from({ length: SKELETON_ROWS }, (_, row) => (
        <div key={row} className="mt-8">
          <div className="live-skeleton mb-3 h-5 w-32 rounded bg-zinc-900" />
          <div className="grid grid-cols-2 gap-x-3 gap-y-5 sm:grid-cols-3 lg:grid-cols-4 lg:gap-x-4">
            {Array.from({ length: LIVE_DISCOVERY.HERO_LIMIT }, (_, index) => (
              <div key={index}>
                <div className="live-skeleton aspect-video rounded-lg bg-zinc-900" />
                <div className="mt-2 flex gap-2">
                  <div className="live-skeleton h-9 w-9 shrink-0 rounded-full bg-zinc-900" />
                  <div className="flex-1 space-y-1.5">
                    <div className="live-skeleton h-3 w-full rounded bg-zinc-900" />
                    <div className="live-skeleton h-3 w-2/3 rounded bg-zinc-900" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
