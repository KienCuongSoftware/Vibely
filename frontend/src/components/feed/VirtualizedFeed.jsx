import { useVirtualizer } from '@tanstack/react-virtual'
import React, { useCallback, useEffect, useImperativeHandle, useRef, useState, forwardRef, memo } from 'react'
import { FEED_CONFIG } from '../../feed/feedConfig.js'

/** Coarse buckets — avoid re-rendering the whole feed on every IO micro-update. */
function visibilityBucket(ratio) {
  if (ratio >= FEED_CONFIG.PLAY_VISIBILITY_RATIO) return 'play'
  if (ratio >= FEED_CONFIG.PAUSE_VISIBILITY_RATIO) return 'mid'
  if (ratio > 0.02) return 'low'
  return 'off'
}

/**
 * Vertical snap-scrolling list with windowed DOM: only virtualized rows mount.
 * Active index is derived from {@link IntersectionObserver} ratios (most visible slide).
 * Media (HLS) attaches only within {@link FEED_CONFIG.MEDIA_WINDOW_RADIUS}.
 */
const VirtualizedFeedInner = forwardRef(function VirtualizedFeed(
  {
    videos,
    itemHeightPx,
    scrollClassName = '',
    activeIndex,
    onActiveIndexChange,
    onNearEnd,
    mediaWindowRadius = FEED_CONFIG.MEDIA_WINDOW_RADIUS,
    children,
  },
  forwardedRef,
) {
  const scrollRef = useRef(null)
  const ratiosRef = useRef(new Map())
  const rafRef = useRef(0)
  const obsRef = useRef(null)
  const visibilitySnapshotRef = useRef('')
  const activeIndexRef = useRef(activeIndex)
  activeIndexRef.current = activeIndex
  /** Bumps on IO updates so slide visibility ratios reach players without mounting all rows. */
  const [visibilityTick, setVisibilityTick] = useState(0)

  const rowVirtualizer = useVirtualizer({
    count: videos.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => itemHeightPx,
    overscan: FEED_CONFIG.VIRTUAL_OVERSCAN,
  })

  useImperativeHandle(
    forwardedRef,
    () => ({
      scrollToIndex: (index, opts = {}) => {
        rowVirtualizer.scrollToIndex(index, { align: 'start', ...opts })
      },
      getScrollElement: () => scrollRef.current,
    }),
    [rowVirtualizer],
  )

  const flushActive = useCallback(() => {
    let bestIdx = -1
    let best = 0
    ratiosRef.current.forEach((ratio, idx) => {
      if (ratio > best) {
        best = ratio
        bestIdx = idx
      }
    })
    if (bestIdx >= 0 && best >= FEED_CONFIG.ACTIVE_INDEX_MIN_RATIO) {
      onActiveIndexChange(bestIdx)
    }

    const center =
      bestIdx >= 0 && best >= FEED_CONFIG.ACTIVE_INDEX_MIN_RATIO
        ? bestIdx
        : activeIndexRef.current
    const lo = Math.max(0, center - mediaWindowRadius - 1)
    const hi = Math.min(videos.length - 1, center + mediaWindowRadius + 1)
    const parts = []
    for (let i = lo; i <= hi; i += 1) {
      const ratio = ratiosRef.current.get(i) ?? 0
      parts.push(`${i}:${visibilityBucket(ratio)}`)
    }
    const snap = parts.join('|')
    if (snap !== visibilitySnapshotRef.current) {
      visibilitySnapshotRef.current = snap
      setVisibilityTick((t) => t + 1)
    }
  }, [mediaWindowRadius, onActiveIndexChange, videos.length])

  useEffect(() => {
    const root = scrollRef.current
    if (!root) return undefined
    const obs = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          const raw = e.target.getAttribute('data-feed-index')
          const idx = raw == null ? NaN : Number(raw)
          if (!Number.isFinite(idx)) continue
          if (e.intersectionRatio <= 0.02) {
            ratiosRef.current.delete(idx)
          } else {
            ratiosRef.current.set(idx, e.intersectionRatio)
          }
        }
        cancelAnimationFrame(rafRef.current)
        rafRef.current = requestAnimationFrame(flushActive)
      },
      {
        root,
        rootMargin: '0px',
        threshold: [0, 0.1, 0.2, 0.35, 0.5, 0.65, 0.7, 0.85, 1],
      },
    )
    obsRef.current = obs
    return () => {
      cancelAnimationFrame(rafRef.current)
      obs.disconnect()
      obsRef.current = null
      ratiosRef.current.clear()
    }
  }, [flushActive, videos.length, itemHeightPx])

  const observeEl = useCallback((el) => {
    const obs = obsRef.current
    if (!el || !obs) return
    obs.observe(el)
  }, [])

  useEffect(() => {
    const root = scrollRef.current
    if (!root || !onNearEnd) return undefined
    const onScroll = () => {
      const max = videos.length
      if (max === 0) return
      const { scrollTop, clientHeight, scrollHeight } = root
      if (
        scrollHeight - (scrollTop + clientHeight) <
        itemHeightPx * FEED_CONFIG.NEAR_END_SLOTS
      ) {
        onNearEnd()
      }
    }
    root.addEventListener('scroll', onScroll, { passive: true })
    queueMicrotask(onScroll)
    return () => root.removeEventListener('scroll', onScroll)
  }, [videos.length, itemHeightPx, onNearEnd])

  void visibilityTick

  const virtualItems = rowVirtualizer.getVirtualItems()

  return (
    <div
      ref={scrollRef}
      className={`snap-y snap-mandatory overflow-y-auto overflow-x-hidden overscroll-y-contain scrollbar-none ${scrollClassName}`}
      style={{
        height: itemHeightPx,
        WebkitOverflowScrolling: 'touch',
        clipPath: 'inset(0 0 -14px 0)',
      }}
    >
      <div
        className="relative w-full"
        style={{ height: `${rowVirtualizer.getTotalSize()}px` }}
      >
        {virtualItems.map((vi) => {
          const video = videos[vi.index]
          if (!video) return null
          const distance = Math.abs(vi.index - activeIndex)
          const loadMedia = distance <= mediaWindowRadius
          const visibilityRatio = ratiosRef.current.get(vi.index) ?? 0
          const isActive = vi.index === activeIndex
          return (
            <div
              key={vi.key}
              data-feed-index={vi.index}
              ref={(el) => {
                rowVirtualizer.measureElement(el)
                if (el) observeEl(el)
              }}
              className="absolute left-0 top-0 w-full snap-start snap-always"
              style={{
                height: `${vi.size}px`,
                transform: `translateY(${vi.start}px)`,
              }}
            >
              {children({
                video,
                index: vi.index,
                loadMedia,
                isActive,
                visibilityRatio,
              })}
            </div>
          )
        })}
      </div>
    </div>
  )
})

export const VirtualizedFeed = memo(VirtualizedFeedInner)
