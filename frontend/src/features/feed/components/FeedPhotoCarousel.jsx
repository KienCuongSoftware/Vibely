import React, { useEffect, useState } from 'react'
import { IoChevronBack, IoChevronForward } from 'react-icons/io5'

/** TikTok-style photo slideshow dwell per slide (ms). */
export const FEED_PHOTO_SLIDE_MS = 3500

export function FeedPhotoCarousel({
  urls,
  className = '',
  onClick,
  /** When true, auto-advance to the next slide every few seconds. */
  active = true,
  intervalMs = FEED_PHOTO_SLIDE_MS,
}) {
  const slides = (Array.isArray(urls) ? urls : []).filter(Boolean)
  const [index, setIndex] = useState(0)

  const slidesKey = slides.join('\0')
  useEffect(() => {
    setIndex(0)
  }, [slidesKey])

  const multi = slides.length > 1

  useEffect(() => {
    if (!active || !multi) return undefined
    const timer = window.setInterval(() => {
      setIndex((i) => (i + 1) % slides.length)
    }, Math.max(1200, Number(intervalMs) || FEED_PHOTO_SLIDE_MS))
    return () => window.clearInterval(timer)
  }, [active, multi, slides.length, intervalMs, index])

  if (!slides.length) return null
  const current = slides[Math.min(index, slides.length - 1)]

  const go = (delta, event) => {
    event?.stopPropagation()
    event?.preventDefault()
    setIndex((i) => (i + delta + slides.length) % slides.length)
  }

  const goTo = (next, event) => {
    event?.stopPropagation()
    event?.preventDefault()
    setIndex(next)
  }

  return (
    <div className={`relative h-full w-full bg-black ${className}`} onClick={onClick}>
      <img src={current} alt="" className="h-full w-full object-contain" draggable={false} />
      {multi ? (
        <div
          className="absolute inset-x-0 bottom-3 z-10 flex items-center justify-center gap-2 px-3"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            type="button"
            className="flex h-7 w-7 shrink-0 cursor-pointer items-center justify-center rounded-full bg-black/35 text-white/85 backdrop-blur-[2px] transition hover:bg-black/50 hover:text-white"
            onClick={(e) => go(-1, e)}
            aria-label="Previous photo"
          >
            <IoChevronBack className="text-base" aria-hidden />
          </button>
          <div
            className="flex max-w-[min(70%,220px)] items-center justify-center gap-1.5 overflow-hidden"
            role="tablist"
            aria-label="Photo slides"
          >
            {slides.map((_, i) => {
              const activeDot = i === index
              return (
                <button
                  key={i}
                  type="button"
                  role="tab"
                  aria-selected={activeDot}
                  aria-label={`Photo ${i + 1} of ${slides.length}`}
                  className={`shrink-0 cursor-pointer rounded-full transition-all ${
                    activeDot
                      ? 'h-1.5 w-1.5 bg-white shadow-[0_0_0_1px_rgba(0,0,0,0.25)]'
                      : 'h-1 w-1 bg-white/45 hover:bg-white/70'
                  }`}
                  onClick={(e) => goTo(i, e)}
                />
              )
            })}
          </div>
          <button
            type="button"
            className="flex h-7 w-7 shrink-0 cursor-pointer items-center justify-center rounded-full bg-black/35 text-white/85 backdrop-blur-[2px] transition hover:bg-black/50 hover:text-white"
            onClick={(e) => go(1, e)}
            aria-label="Next photo"
          >
            <IoChevronForward className="text-base" aria-hidden />
          </button>
        </div>
      ) : null}
    </div>
  )
}

export function photoUrlsOf(video) {
  const raw = video?.photoUrls
  if (Array.isArray(raw) && raw.length) return raw.filter(Boolean)
  if (String(video?.mediaKind || '').toUpperCase() === 'PHOTO') {
    const one = String(video?.thumbnailUrl || video?.videoUrl || '').trim()
    return one ? [one] : []
  }
  return []
}
