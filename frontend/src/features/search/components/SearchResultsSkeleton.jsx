import React from 'react'

function Pulse({ className = '' }) {
  return (
    <div
      className={`animate-pulse rounded-md bg-[#2f2f2f] ${className}`}
      aria-hidden
    />
  )
}

function UserRowSkeleton() {
  return (
    <li className="flex items-center gap-4 py-2.5">
      <Pulse className="h-14 w-14 shrink-0 rounded-full" />
      <div className="min-w-0 flex-1 space-y-2.5">
        <Pulse className="h-4 w-44 max-w-[50%]" />
        <Pulse className="h-3.5 w-64 max-w-[70%]" />
      </div>
      <Pulse className="h-9 w-[108px] shrink-0 rounded-md" />
    </li>
  )
}

function VideoCardSkeleton() {
  return (
    <li>
      <Pulse className="aspect-3/4 w-full rounded-sm" />
      <div className="mt-2 space-y-2">
        <Pulse className="h-3.5 w-[92%]" />
        <div className="flex items-center gap-1.5">
          <Pulse className="h-5 w-5 shrink-0 rounded-full" />
          <Pulse className="h-3 w-28" />
        </div>
      </div>
    </li>
  )
}

/**
 * TikTok-style search loading skeletons.
 * - Top / Video → video card grid
 * - Người dùng → user row list
 */
export function SearchResultsSkeleton({ activeTab = 'top' }) {
  if (activeTab === 'users') {
    return (
      <div aria-busy="true" aria-label="Đang tải kết quả">
        <ul className="space-y-1">
          {Array.from({ length: 8 }, (_, i) => (
            <UserRowSkeleton key={`user-skel-${i}`} />
          ))}
        </ul>
      </div>
    )
  }

  return (
    <div aria-busy="true" aria-label="Đang tải kết quả">
      <ul className="grid grid-cols-2 gap-x-3 gap-y-5 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
        {Array.from({ length: 18 }, (_, i) => (
          <VideoCardSkeleton key={`video-skel-${i}`} />
        ))}
      </ul>
    </div>
  )
}
