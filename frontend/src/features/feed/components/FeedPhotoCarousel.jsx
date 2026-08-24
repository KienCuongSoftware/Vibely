import React, { useState } from 'react'

export function FeedPhotoCarousel({ urls, className = '', onClick }) {
  const slides = (Array.isArray(urls) ? urls : []).filter(Boolean)
  const [index, setIndex] = useState(0)
  if (!slides.length) return null
  const current = slides[Math.min(index, slides.length - 1)]

  const go = (delta, event) => {
    event?.stopPropagation()
    setIndex((i) => (i + delta + slides.length) % slides.length)
  }

  return (
    <div className={`relative h-full w-full bg-black ${className}`} onClick={onClick}>
      <img src={current} alt="" className="h-full w-full object-contain" />
      {slides.length > 1 ? (
        <>
          <button
            type="button"
            className="absolute left-2 top-1/2 z-10 -translate-y-1/2 rounded-full bg-black/45 px-2 py-3 text-white"
            onClick={(e) => go(-1, e)}
            aria-label="Previous photo"
          >
            ‹
          </button>
          <button
            type="button"
            className="absolute right-2 top-1/2 z-10 -translate-y-1/2 rounded-full bg-black/45 px-2 py-3 text-white"
            onClick={(e) => go(1, e)}
            aria-label="Next photo"
          >
            ›
          </button>
          <div className="absolute top-3 right-3 z-10 rounded-full bg-black/55 px-2 py-0.5 text-[11px] font-medium text-white">
            {index + 1}/{slides.length}
          </div>
          <div className="absolute inset-x-0 bottom-3 z-10 flex justify-center gap-1">
            {slides.map((_, i) => (
              <span
                key={i}
                className={`h-1 rounded-full ${i === index ? 'w-4 bg-white' : 'w-1 bg-white/40'}`}
              />
            ))}
          </div>
        </>
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
