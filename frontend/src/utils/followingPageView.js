import { apiClient } from '../api/client.js'

/** Bật feed sau F5 đúng trên /following (set lúc bootstrap). */
export const FOLLOWING_SHOW_FEED_FLAG = 'vibely:following-show-feed'

/** Sidebar bấm "Đã follow" — đọc một lần khi FollowingPage mount. */
export const FOLLOWING_PREFER_FEED_FLAG = 'vibely:following-prefer-feed'

export function syncFollowingFeedFlagOnDocumentLoad() {
  if (typeof window === 'undefined') return
  const entry = performance.getEntriesByType('navigation')[0]
  const reloadedOnFollowing =
    entry?.type === 'reload' && window.location.pathname === '/following'
  if (reloadedOnFollowing) {
    sessionStorage.setItem(FOLLOWING_SHOW_FEED_FLAG, '1')
  } else {
    sessionStorage.removeItem(FOLLOWING_SHOW_FEED_FLAG)
  }
}

export function shouldShowFollowingVideoFeed() {
  if (typeof window === 'undefined') return false
  return sessionStorage.getItem(FOLLOWING_SHOW_FEED_FLAG) === '1'
}

export function clearFollowingVideoFeedFlag() {
  if (typeof window === 'undefined') return
  sessionStorage.removeItem(FOLLOWING_SHOW_FEED_FLAG)
}

/** Gọi trước khi navigate tới /following từ sidebar. */
export function markFollowingPreferFeedFromSidebar() {
  if (typeof window === 'undefined') return
  sessionStorage.setItem(FOLLOWING_PREFER_FEED_FLAG, '1')
}

export function peekFollowingPreferFeedFromSidebar() {
  if (typeof window === 'undefined') return false
  return sessionStorage.getItem(FOLLOWING_PREFER_FEED_FLAG) === '1'
}

/** Xóa cờ sau khi đã resolve xong (tránh Strict Mode consume sớm). */
export function clearFollowingPreferFeedFromSidebar() {
  if (typeof window === 'undefined') return
  sessionStorage.removeItem(FOLLOWING_PREFER_FEED_FLAG)
}

/**
 * @param {string} token
 * @param {{ preferFeed?: boolean }} options — preferFeed: sidebar quay lại hoặc F5
 * @returns {Promise<'grid' | 'feed'>}
 */
export async function resolveFollowingViewMode(token, { preferFeed = false } = {}) {
  if (!token) return 'grid'

  let followingCount = 0
  try {
    const res = await apiClient.getSuggestedCreators(token, { page: 0, size: 1 })
    followingCount = Number(res?.viewerFollowingCount ?? 0)
  } catch {
    return 'grid'
  }

  if (followingCount <= 0) return 'grid'

  const wantFeed = preferFeed || shouldShowFollowingVideoFeed()
  if (!wantFeed) return 'grid'

  try {
    const feed = await apiClient.getFollowingFeed(token, { page: 0, size: 1 })
    const hasVideos = Array.isArray(feed?.items) && feed.items.length > 0
    if (hasVideos) {
      clearFollowingVideoFeedFlag()
      return 'feed'
    }
  } catch {
    /* fall through */
  }

  clearFollowingVideoFeedFlag()
  return 'grid'
}
