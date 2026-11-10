import React, { forwardRef } from 'react'
import { FeedVideoPlayer } from '@/features/feed/components/FeedVideoPlayer'

function feedCellIsLandscape(video) {
  const w = Number(video?.sourceWidthPx)
  const h = Number(video?.sourceHeightPx)
  return w > 0 && h > 0 && w >= h
}

/** Video sắc nét nằm giữa khung; phần thừa để lộ nền mờ. */
function feedSharpVideoClass(landscape) {
  if (landscape) {
    return 'absolute z-1 top-1/2 left-0 h-auto max-h-full w-full -translate-y-1/2 aspect-video object-contain'
  }
  return 'absolute z-1 top-0 left-1/2 h-full w-auto max-w-full -translate-x-1/2 aspect-[9/16] object-contain'
}

/**
 * Một chỗ mount FeedVideoPlayer cho slide feed — tránh copy 2 khối props gần giống.
 */
export const FeedSlideVideoPlayer = forwardRef(function FeedSlideVideoPlayer(
  {
    video,
    playbackUrl,
    poster,
    isActive = false,
    reportedHidden = false,
    userPaused = false,
    playbackMuted = false,
    loop = false,
    loadMedia = false,
    hasPlayback = false,
    mobileFullBleed = false,
    commentsDockOpen = false,
    visibilityRatio = 0,
    feedVideoQuality,
    effectiveStageWide = false,
    onPlaybackTick,
    onPlaybackEnded,
    onTogglePlayback,
    onIntrinsicLandscape,
    stopPropagationOnClick = false,
  },
  ref,
) {
  const className = mobileFullBleed
    ? 'relative z-1 h-full w-full cursor-pointer'
    : `cursor-pointer bg-transparent ${feedSharpVideoClass(
        feedCellIsLandscape(video) || (isActive && effectiveStageWide),
      )}`

  return (
    <FeedVideoPlayer
      key={String(video?.publicId)}
      ref={ref}
      videoUrl={playbackUrl}
      poster={poster}
      muted={!isActive || playbackMuted}
      loop={loop}
      loadMedia={loadMedia && hasPlayback && !reportedHidden}
      isActive={isActive && !reportedHidden}
      userPaused={isActive && (userPaused || reportedHidden)}
      visibilityRatio={
        (mobileFullBleed || commentsDockOpen) && isActive ? 1 : visibilityRatio
      }
      feedVideoId={video?.publicId}
      streamQuality={feedVideoQuality}
      sourceHeightPx={video?.sourceHeightPx}
      onHlsQualitiesAvailable={undefined}
      onPlaybackTick={isActive ? onPlaybackTick : undefined}
      onPlaybackEnded={isActive ? onPlaybackEnded : undefined}
      className={className}
      fitContain
      onClick={(event) => {
        if (stopPropagationOnClick) event.stopPropagation()
        onTogglePlayback?.(event)
      }}
      onIntrinsicLandscape={
        isActive
          ? (wide) => onIntrinsicLandscape?.(wide, video?.publicId)
          : undefined
      }
    />
  )
})
