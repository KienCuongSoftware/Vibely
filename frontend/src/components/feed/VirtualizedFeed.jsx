import { useVirtualizer } from '@tanstack/react-virtual'
import React, { useCallback, useEffect, useImperativeHandle, useLayoutEffect, useRef, useState, forwardRef, memo } from 'react'
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
    /** Giữ slide hiện tại — IO chỉ cập nhật visibility, không đổi active index. */
    freezeActiveIndex = false,
    /** Khóa cuộn feed (dock bình luận) — giữ player mounted. */
    scrollLocked = false,
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
  const freezeActiveIndexRef = useRef(freezeActiveIndex)
  freezeActiveIndexRef.current = freezeActiveIndex
  const scrollLockedRef = useRef(scrollLocked)
  scrollLockedRef.current = scrollLocked
  const itemHeightPxRef = useRef(itemHeightPx)
  itemHeightPxRef.current = itemHeightPx
  /** Chặn IO đổi activeIndex ngay sau khi đóng bình luận / đổi chiều cao slot. */
  const suppressActiveChangeUntilRef = useRef(0)
  /** Bumps on IO updates so slide visibility ratios reach players without mounting all rows. */
  const [visibilityTick, setVisibilityTick] = useState(0)

  const rowVirtualizer = useVirtualizer({
    count: videos.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => itemHeightPxRef.current,
    overscan: FEED_CONFIG.VIRTUAL_OVERSCAN,
  })

  const syncScrollToActive = useCallback(() => {
    const root = scrollRef.current
    if (!root) return
    if (scrollLockedRef.current) {
      root.scrollTop = 0
      return
    }
    const h = itemHeightPxRef.current
    const top = Math.max(0, activeIndexRef.current) * h
    root.scrollTop = top
    try {
      rowVirtualizer.scrollToOffset(top, { align: 'start' })
    } catch {
      /* virtualizer chưa sẵn sàng */
    }
    ratiosRef.current.clear()
    ratiosRef.current.set(activeIndexRef.current, 1)
    suppressActiveChangeUntilRef.current = performance.now() + 480
  }, [rowVirtualizer])

  /** Khi chiều cao slot đổi (16:9 / bình luận), ép scroll khớp activeIndex — tránh lộ slide khác. */
  useLayoutEffect(() => {
    rowVirtualizer.measure()
    syncScrollToActive()
    const raf = requestAnimationFrame(() => {
      rowVirtualizer.measure()
      syncScrollToActive()
    })
    return () => cancelAnimationFrame(raf)
  }, [itemHeightPx, activeIndex, scrollLocked, syncScrollToActive, videos.length, rowVirtualizer])

  useImperativeHandle(
    forwardedRef,
    () => ({
      scrollToIndex: (index, opts = {}) => {
        rowVirtualizer.scrollToIndex(index, { align: 'start', ...opts })
        const root = scrollRef.current
        if (root) {
          root.scrollTop = Math.max(0, index) * itemHeightPx
        }
      },
      getScrollElement: () => scrollRef.current,
    }),
    [rowVirtualizer, itemHeightPx],
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
    if (
      bestIdx >= 0 &&
      best >= FEED_CONFIG.ACTIVE_INDEX_MIN_RATIO &&
      !freezeActiveIndexRef.current &&
      performance.now() >= suppressActiveChangeUntilRef.current
    ) {
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
      if (scrollLockedRef.current) return
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

  useEffect(() => {
    const root = scrollRef.current
    if (!root || !scrollLocked) return undefined
    const blockWheel = (e) => {
      e.preventDefault()
    }
    root.addEventListener('wheel', blockWheel, { passive: false })
    return () => root.removeEventListener('wheel', blockWheel)
  }, [scrollLocked])

  void visibilityTick

  /** Dock bình luận: chỉ mount slide active — giữ HLS, tránh lệch virtual scroll. */
  if (scrollLocked) {
    const video = videos[activeIndex]
    if (!video) return null
    return (
      <div
        ref={scrollRef}
        className={`overflow-hidden touch-none overflow-x-hidden overscroll-y-contain scrollbar-none ${scrollClassName}`}
        style={{ height: itemHeightPx }}
      >
        {children({
          video,
          index: activeIndex,
          loadMedia: true,
          isActive: true,
          visibilityRatio: 1,
        })}
      </div>
    )
  }

  const virtualItems = rowVirtualizer.getVirtualItems()
  const snapClass =
    scrollLocked || freezeActiveIndex ? '' : 'snap-y snap-mandatory'
  const overflowClass = scrollLocked ? 'overflow-hidden touch-none' : 'overflow-y-auto'

  return (
    <div
      ref={scrollRef}
      className={`${snapClass} ${overflowClass} overflow-x-hidden overscroll-y-contain scrollbar-none ${scrollClassName}`}
      style={{
        height: itemHeightPx,
        WebkitOverflowScrolling: 'touch',
      }}
    >
      <div
        className="relative w-full"
        style={{ height: `${videos.length * itemHeightPx}px` }}
      >
        {virtualItems.map((vi) => {
          const video = videos[vi.index]
          if (!video) return null
          const distance = Math.abs(vi.index - activeIndex)
          /** Luôn buffer video kế tiếp — tránh giật khi vuốt như TikTok */
          const loadMedia =
            distance <= mediaWindowRadius || vi.index === activeIndex + 1
          const visibilityRatio = ratiosRef.current.get(vi.index) ?? 0
          const isActive = vi.index === activeIndex
          const slotTopPx = vi.index * itemHeightPx
          return (
            <div
              key={vi.key}
              data-feed-index={vi.index}
              ref={(el) => {
                if (el) observeEl(el)
              }}
              className="absolute left-0 top-0 w-full snap-start snap-always"
              style={{
                height: `${itemHeightPx}px`,
                transform: `translateY(${slotTopPx}px)`,
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
