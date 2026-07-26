import React from 'react'

const DEFAULT_COVER = '/images/users/default-avatar.jpeg'

/**
 * Video poster tuned for grid tiles: lazy load, high-quality downscale in browser.
 */
export function VideoThumbnailImg({
  src,
  alt = '',
  className = '',
  fallback = DEFAULT_COVER,
}) {
  const resolved = String(src ?? '').trim() || fallback
  return (
    <img
      src={resolved}
      alt={alt}
      loading="lazy"
      decoding="async"
      draggable={false}
      referrerPolicy="no-referrer"
      className={`h-full w-full object-cover ${className}`.trim()}
      onError={(e) => {
        if (e.currentTarget.src !== fallback) {
          e.currentTarget.src = fallback
        }
      }}
    />
  )
}

export default VideoThumbnailImg
