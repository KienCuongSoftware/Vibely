const FEED_FOLLOWED_AUTHORS_STORAGE_PREFIX = 'vibely:feed-followed-authors:'

function decodeJwtSubject(token) {
  if (!token || typeof token !== 'string') return null
  const parts = token.split('.')
  if (parts.length < 2) return null
  try {
    const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')))
    return payload?.sub ?? null
  } catch {
    return null
  }
}

function feedFollowedAuthorsStorageKey(token) {
  const subject = decodeJwtSubject(token)
  return `${FEED_FOLLOWED_AUTHORS_STORAGE_PREFIX}${subject || 'guest'}`
}

export function readFeedFollowedAuthorIds(token) {
  if (typeof window === 'undefined' || !token) return new Set()
  try {
    const raw = window.sessionStorage.getItem(feedFollowedAuthorsStorageKey(token))
    if (!raw) return new Set()
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return new Set()
    return new Set(
      parsed
        .map((value) => Number(value))
        .filter((value) => Number.isFinite(value) && value > 0),
    )
  } catch {
    return new Set()
  }
}

export function writeFeedFollowedAuthorIds(token, ids) {
  if (typeof window === 'undefined' || !token) return
  try {
    const values = [...ids]
      .map((value) => Number(value))
      .filter((value) => Number.isFinite(value) && value > 0)
    window.sessionStorage.setItem(
      feedFollowedAuthorsStorageKey(token),
      JSON.stringify(values),
    )
  } catch {
    /* noop */
  }
}

export function markFeedAuthorFollowed(token, authorId) {
  const key = Number(authorId)
  if (!token || !Number.isFinite(key) || key <= 0) return
  const next = readFeedFollowedAuthorIds(token)
  next.add(key)
  writeFeedFollowedAuthorIds(token, next)
}

export function markFeedAuthorUnfollowed(token, authorId) {
  const key = Number(authorId)
  if (!token || !Number.isFinite(key) || key <= 0) return
  const next = readFeedFollowedAuthorIds(token)
  next.delete(key)
  writeFeedFollowedAuthorIds(token, next)
}

/** Chỉ giữ video từ creator mà viewer đã follow (feed Đã follow). */
export function isVideoFromFollowedCreator(video, followedAuthorIds) {
  if (Boolean(video?.followedByViewer) || Boolean(video?.isAuthorFollowed)) {
    return true
  }
  const authorId = Number(video?.authorId)
  if (!Number.isFinite(authorId) || authorId <= 0) return false
  return followedAuthorIds instanceof Set && followedAuthorIds.has(authorId)
}

export function filterVideosFromFollowedCreators(items, followedAuthorIds) {
  if (!Array.isArray(items)) return []
  return items.filter((item) => isVideoFromFollowedCreator(item, followedAuthorIds))
}
