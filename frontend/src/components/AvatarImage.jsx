import React, { useEffect, useState } from 'react'

export const DEFAULT_AVATAR_URL = '/images/users/default-avatar.jpeg'

/**
 * Avatar with referrerPolicy + fallback when OAuth CDN URLs fail (e.g. fbsbx.com 500).
 */
export function AvatarImage({
  src,
  alt = '',
  className = '',
  fallbackSrc = DEFAULT_AVATAR_URL,
  ...props
}) {
  const resolved = String(src ?? '').trim() || fallbackSrc
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    setFailed(false)
  }, [resolved])

  return (
    <img
      {...props}
      src={failed ? fallbackSrc : resolved}
      alt={alt}
      className={className}
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
    />
  )
}
