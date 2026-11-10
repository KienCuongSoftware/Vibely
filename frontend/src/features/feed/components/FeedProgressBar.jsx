import React from 'react'
import { useTranslation } from 'react-i18next'
import { FEED_PROGRESS_TRACK_BOTTOM_PX } from '@/features/feed/utils/feedLayout.js'
import { formatPlaybackTime } from '@/features/feed/utils/videoDuration.js'

/**
 * Thanh progress feed — presentational; scrub logic giữ ở stage.
 */
export function FeedProgressBar({
  theaterMode = false,
  controlPopoverOpen = false,
  progressScrubbing = false,
  progressPreview = { current: 0, duration: 0 },
  trackRef,
  innerRef,
  fillRef,
  knobRef,
  onScrubStart,
  onKeySeek,
}) {
  const { t } = useTranslation()
  const pointerClass = controlPopoverOpen
    ? 'pointer-events-none'
    : 'pointer-events-auto'

  return (
    <div
      ref={trackRef}
      className={
        theaterMode
          ? `group/progress absolute inset-x-0 bottom-0 z-80 h-4 cursor-pointer ${pointerClass}`
          : `group/progress absolute inset-x-0 z-80 h-4 w-full cursor-pointer ${pointerClass}`
      }
      style={theaterMode ? undefined : { bottom: FEED_PROGRESS_TRACK_BOTTOM_PX }}
      role="slider"
      tabIndex={0}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={0}
      aria-label={t('feed.progress')}
      onMouseDown={(e) => {
        e.preventDefault()
        e.stopPropagation()
        onScrubStart?.(e.clientX)
      }}
      onTouchStart={(e) => {
        e.stopPropagation()
        const cx = e.touches[0]?.clientX
        if (cx != null) onScrubStart?.(cx)
      }}
      onClick={(e) => e.stopPropagation()}
      onKeyDown={(e) => {
        if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return
        e.preventDefault()
        onKeySeek?.(e.key === 'ArrowLeft' ? -5 : 5)
      }}
    >
      <div
        className={`pointer-events-none absolute bottom-[calc(100%+26px)] left-1/2 z-30 -translate-x-1/2 text-[2rem] leading-none font-semibold text-white [text-shadow:0_2px_10px_rgba(0,0,0,0.85)] transition-opacity duration-150 ${
          progressScrubbing ? 'opacity-100' : 'opacity-0'
        }`}
        aria-hidden
      >
        {formatPlaybackTime(progressPreview.current)} /{' '}
        {formatPlaybackTime(progressPreview.duration)}
      </div>
      <div
        ref={innerRef}
        className={
          theaterMode
            ? 'absolute inset-x-0 bottom-1 h-[3px] transition-[height] duration-150 ease-out group-hover/progress:h-[5px]'
            : 'absolute inset-x-0 bottom-0 h-[3px] transition-[height] duration-150 ease-out group-hover/progress:h-[5px]'
        }
      >
        <div className="absolute inset-0 bg-white/40" aria-hidden />
        <div
          ref={fillRef}
          className={`absolute inset-0 origin-left bg-[#fe2c55] will-change-transform ${progressScrubbing ? '' : 'transition-transform duration-150 ease-out'}`}
          style={{ transform: 'scaleX(0)' }}
        />
        <div
          ref={knobRef}
          className={`pointer-events-none absolute top-1/2 left-0 z-10 h-3.5 w-3.5 -translate-x-1/2 -translate-y-[60%] transition-opacity duration-200 ease-out ${progressScrubbing ? 'opacity-100' : 'opacity-0 group-hover/progress:opacity-100'}`}
          style={{ left: '0%' }}
          aria-hidden
        >
          <div className="h-full w-full rounded-full bg-white shadow-[0_0_0_1.5px_rgba(0,0,0,0.5),0_1px_4px_rgba(0,0,0,0.35)] transition-transform duration-200 ease-out group-hover/progress:scale-110" />
        </div>
      </div>
    </div>
  )
}
