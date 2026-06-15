import React, { useEffect, useRef, useState } from 'react'
import { VideoThumbnailImg } from './VideoThumbnailImg.jsx'

const DEFAULT_COVER = '/images/users/default-avatar.jpeg'

/** Thumbnail until hover; muted loop preview while `playing`. */
export function GridHoverVideoMedia({
  videoUrl,
  thumbnailUrl,
  playing = false,
  coverFallback = DEFAULT_COVER,
}) {
  const videoRef = useRef(null)
  const url = String(videoUrl ?? '').trim()
  const thumb = String(thumbnailUrl ?? '').trim()
  const poster = thumb || coverFallback
  const [videoReady, setVideoReady] = useState(false)

  useEffect(() => {
    if (!playing) {
      setVideoReady(false)
    }
  }, [playing, url])

  useEffect(() => {
    const el = videoRef.current
    if (!el || !url || !playing) return undefined
    const playback = el.play()
    if (playback?.catch) {
      playback.catch(() => {})
    }
    return () => {
      try {
        el.pause()
      } catch {
        /* noop */
      }
      try {
        el.currentTime = 0
      } catch {
        /* noop */
      }
    }
  }, [playing, url])

  const thumbNode = <VideoThumbnailImg src={poster} fallback={coverFallback} />

  if (url && playing) {
    return (
      <div className="relative h-full w-full">
        {!videoReady ? <div className="absolute inset-0">{thumbNode}</div> : null}
        <video
          ref={videoRef}
          src={url}
          poster={poster || undefined}
          muted
          loop
          playsInline
          preload="metadata"
          className="h-full w-full object-cover"
          onLoadedData={() => setVideoReady(true)}
          onCanPlay={() => setVideoReady(true)}
        />
      </div>
    )
  }

  return <div className="relative h-full w-full">{thumbNode}</div>
}

export default GridHoverVideoMedia
