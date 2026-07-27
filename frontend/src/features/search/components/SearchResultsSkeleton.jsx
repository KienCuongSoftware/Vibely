import React from 'react'

function Pulse({ className = '' }) {
  return (
    <div
      className={`animate-pulse rounded-md bg-[#252525] ${className}`}
      aria-hidden
    />
  )
}

function UserRowSkeleton() {
  return (
    <li className="flex items-center gap-4 py-2">
      <Pulse className="h-14 w-14 shrink-0 rounded-full" />
      <div className="min-w-0 flex-1 space-y-2">
        <Pulse className="h-4 w-40 max-w-[55%]" />
        <Pulse className="h-3.5 w-28 max-w-[40%]" />
      </div>
      <Pulse className="h-9 w-24 shrink-0 rounded-md" />
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
          <Pulse className="h-3 w-24" />
        </div>
      </div>
    </li>
  )
}

/**
 * TikTok-style search loading: dark pulsing placeholders instead of plain text.
 */
export function SearchResultsSkeleton({
  showUsers = true,
  showVideos = true,
  activeTab = 'top',
}) {
  const userCount = activeTab === 'users' ? 8 : 3
  const videoCount = activeTab === 'users' ? 0 : 18

  return (
    <div aria-busy="true" aria-label="Đang tải kết quả">
      {showUsers ? (
        <section className="mb-10">
          {activeTab === 'top' ? (
            <Pulse className="mb-4 h-5 w-28" />
          ) : null}
          <ul className="space-y-1">
            {Array.from({ length: userCount }, (_, i) => (
              <UserRowSkeleton key={`user-skel-${i}`} />
            ))}
          </ul>
        </section>
      ) : null}

      {showVideos && videoCount > 0 ? (
        <section>
          {activeTab === 'top' && showUsers ? (
            <Pulse className="mb-4 h-5 w-16" />
          ) : null}
          <ul className="grid grid-cols-2 gap-x-3 gap-y-5 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
            {Array.from({ length: videoCount }, (_, i) => (
              <VideoCardSkeleton key={`video-skel-${i}`} />
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  )
}
