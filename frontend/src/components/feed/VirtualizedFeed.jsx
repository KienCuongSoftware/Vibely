import { useVirtualizer } from '@tanstack/react-virtual'
import React, { useCallback, useEffect, useImperativeHandle, useRef, forwardRef } from 'react'

const NEAR_END_SLOTS = 5

/**
 * Vertical snap-scrolling list with windowed DOM: only virtualized rows mount.
 * Active index is derived from {@link IntersectionObserver} ratios (most visible slide).
 */
export const VirtualizedFeed = forwardRef(function VirtualizedFeed(
  {
    videos,
    itemHeightPx,
    scrollClassName = '',
    activeIndex,
    onActiveIndexChange,
    onNearEnd,
    children,
  },
  forwardedRef,
) {
  const scrollRef = useRef(null)
  const ratiosRef = useRef(new Map())
  const rafRef = useRef(0)
  const obsRef = useRef(null)

  const rowVirtualizer = useVirtualizer({
    count: videos.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => itemHeightPx,
    overscan: 2,
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
    if (bestIdx >= 0 && best >= 0.34) {
      onActiveIndexChange(bestIdx)
    }
  }, [onActiveIndexChange])

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
      { root, rootMargin: '0px', threshold: [0, 0.1, 0.25, 0.34, 0.5, 0.65, 0.8, 1] },
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
      if (scrollHeight - (scrollTop + clientHeight) < itemHeightPx * NEAR_END_SLOTS) {
        onNearEnd()
      }
    }
    root.addEventListener('scroll', onScroll, { passive: true })
    queueMicrotask(onScroll)
    return () => root.removeEventListener('scroll', onScroll)
  }, [videos.length, itemHeightPx, onNearEnd])

  const virtualItems = rowVirtualizer.getVirtualItems()

  return (
    <div
      ref={scrollRef}
      className={`snap-y snap-mandatory overflow-y-auto overflow-x-hidden overscroll-y-contain scrollbar-none ${scrollClassName}`}
      style={{
        height: itemHeightPx,
        WebkitOverflowScrolling: "touch",
        clipPath: "inset(0 0 -14px 0)",
      }}
    >
      <div
        className="relative w-full"
        style={{ height: `${rowVirtualizer.getTotalSize()}px` }}
      >
        {virtualItems.map((vi) => {
          const video = videos[vi.index]
          if (!video) return null
          const loadMedia = Math.abs(vi.index - activeIndex) <= 1
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
                isActive: vi.index === activeIndex,
              })}
            </div>
          )
        })}
      </div>
    </div>
  )
})
