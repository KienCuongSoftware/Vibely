import React from 'react'

function Pulse({ className = '' }) {
  return (
    <div
      className={`animate-pulse rounded-md bg-[#2f2f2f] ${className}`}
      aria-hidden
    />
  )
}

export function ExploreTabsSkeleton({ count = 8 }) {
  return (
    <div className="flex w-max gap-2 pb-1" aria-busy="true" aria-label="Đang tải danh mục">
      {Array.from({ length: count }, (_, i) => (
        <Pulse
          key={`explore-tab-skel-${i}`}
          className={`h-8 rounded-full ${i === 0 ? 'w-16' : i % 3 === 0 ? 'w-28' : 'w-20'}`}
        />
      ))}
    </div>
  )
}

function ExploreVideoCardSkeleton() {
  return (
    <li className="list-none">
      <Pulse className="aspect-[9/16] w-full rounded-lg" />
      <div className="mt-2 flex items-center gap-1.5">
        <Pulse className="h-5 w-5 shrink-0 rounded-full" />
        <Pulse className="h-3 w-20" />
      </div>
    </li>
  )
}

/**
 * Explore grid skeleton — matches mobile 2-col / desktop 3–6 col video cards.
 */
export function ExplorePageSkeleton({ count = 12, mobile = false }) {
  return (
    <ul
      className={
        mobile
          ? 'mt-3 grid grid-cols-2 gap-x-2 gap-y-4 sm:gap-x-3'
          : 'mt-5 grid grid-cols-3 gap-x-3 gap-y-4 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6'
      }
      aria-busy="true"
      aria-label="Đang tải video khám phá"
    >
      {Array.from({ length: count }, (_, i) => (
        <ExploreVideoCardSkeleton key={`explore-video-skel-${i}`} />
      ))}
    </ul>
  )
}

export function ExploreLoadMoreSkeleton({ count = 6, mobile = false }) {
  return (
    <ul
      className={
        mobile
          ? 'mt-4 grid grid-cols-2 gap-x-2 gap-y-4 sm:gap-x-3'
          : 'mt-4 grid grid-cols-3 gap-x-3 gap-y-4 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6'
      }
      aria-busy="true"
      aria-label="Đang tải thêm"
    >
      {Array.from({ length: count }, (_, i) => (
        <ExploreVideoCardSkeleton key={`explore-more-skel-${i}`} />
      ))}
    </ul>
  )
}
